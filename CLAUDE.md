# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Lactia** — A mobile-first web interface for the NLM LactMed® database, providing drug-lactation safety information for parents and healthcare providers.

**Sister Project:** Matria (`~/Desktop/Matria`) covers **pregnancy** drug safety using OpenFDA. Same stack but separate codebase. Do not confuse — Lactia = NCBI LactMed (breastfeeding), Matria = OpenFDA (pregnancy).

## Commands

| Task | Command |
|------|---------|
| Dev server (no functions) | `npm run dev` |
| Build | `npm run build` |
| Lint | `npm run lint` |
| Local dev with CF Functions | `npm run build && npx wrangler pages dev dist` |
| Deploy | `npm run build && npx wrangler pages deploy dist --project-name lactia` |
| Refresh drug title index | `npm run fetch-titles` (writes `src/data/drugTitles.json`; also runs monthly via GitHub Actions) |

There are no tests configured.

**On every deploy:** increment `CACHE_VERSION` in `public/sw.js` to invalidate stale caches.

## Stack

- **Frontend:** React 19 (Vite 7) + Tailwind CSS 4 (via `@tailwindcss/vite`)
- **Hosting:** Cloudflare Pages (static assets + Pages Functions)
- **Data:** Live fetch from NCBI E-utilities API — no local database
- **Server functions:** Cloudflare Pages Functions at `functions/api/` — `search.js` (NCBI search proxy), `monograph.js` (HTMLRewriter monograph proxy), `count.js` (KV search analytics)
- **PWA:** Hand-rolled service worker at `public/sw.js` (no vite-plugin-pwa — avoids CF Pages conflicts)

## Architecture

### Search Workflow (Server-Side Proxy)

1. **User Input:** User enters a drug or brand name (e.g., "Ibuprofen" or "Nurofen").
2. **Client:** `src/api/lactmed.js` makes a single `GET /api/search?q={query}` request to the CF Pages Function.
3. **Server (`functions/api/search.js`):** Runs the full NCBI pipeline server-side (datacenter-to-datacenter, faster than client-side):
   - **Tier 1 — Title search:** `{query}*[title] AND lactmed[book] AND chapter[type]` with `retmax=100`. Returns only drugs whose name matches (precise, alphabetical). Handles most searches.
   - **Tier 2 — Broad search:** If title search returns 0 results, retries without `[title]`. Catches partial international names (e.g., "parace" finds Acetaminophen via body text mention of "paracetamol").
   - **Tier 3 — Spell correction:** If both searches return 0, calls NCBI ESpell API (`espell.fcgi`). If a correction is found (e.g., "fluoxatine" → "fluoxetine"), re-searches with the corrected term. UI shows "Showing results for **fluoxetine**".
   - **Pipeline:** ESearch → ELink (books→pubmed) → EFetch (XML). Results sorted alphabetically by title.
   - **XML parsing:** Regex-based (no `DOMParser` in CF Workers). Extracts `ArticleTitle`, `AbstractText`, `ContributionDate`, `ArticleId[bookaccession]`.
   - **Caching:** `Cache-Control: public, max-age=3600` (1h edge cache). Repeat searches served instantly from CF edge.
   - **Rate-limit handling:** `ncbiFetch()` helper retries once after 350ms on HTTP 429 (NCBI rate limit).
   - **API key:** Reads `NCBI_API_KEY` from CF environment (set as CF Pages secret). Raises NCBI rate limit from 3 to 10 req/sec. Required — spell-correction searches make up to 7 NCBI calls per request.
4. **Response:** `{ results: [...], correction: null|string }`
5. **Display:**
   - **Multiple results:** Compact title list ("9 results — tap to view"). User taps a drug name to see full card. "All results" button to return to list.
   - **Single result:** Full DrugCard shown directly.
   - Mandatory NLM disclaimer in footer.

### Monograph Subsections (Cloudflare Pages Function)

DrugCard has a "Show details" button that lazy-loads full monograph subsections on first tap:
1. **Endpoint:** `/api/monograph?id=NBK500986` — Cloudflare Pages Function at `functions/api/monograph.js`
2. **Server-side:** Fetches `ncbi.nlm.nih.gov/books/{id}/`, uses `HTMLRewriter` (Cloudflare's built-in streaming HTML parser) to extract 4 subsections by CSS attribute selectors. Post-processes text with `decodeEntities()` (HTML entity decoding) and `insertSubHeadings()` (line breaks before "Maternal Levels." / "Infant Levels."):
   - `div[id$=".Drug_Levels"]` → drugLevels
   - `div[id$=".Effects_in_Breastfed_Infants"]` → effectsInfant
   - `div[id*=".Effects_on_Lactation"]` → effectsLactation (contains-match handles truncation variant)
   - `div[id$=".Alternate_Drugs_to_Consider"]` → alternatives
3. **Caching:** `Cache-Control: public, max-age=86400` (24h CDN cache)
4. **Client:** `src/api/monograph.js` fetches the endpoint; DrugCard caches the result in component state for instant re-toggle

### Name Resolution (Brand + International Generic)

`resolveBrand(query, signal)` is async and uses a two-tier strategy:
1. **Local brand mapping (instant):** Checks `src/data/brandToGeneric.json` (~400 AU/UK/US brand-to-generic mappings, bundled at build time). Returns `{ type: 'brand', generic: "ibuprofen", original: "Nurofen" }`.
2. **RxNorm API fallback (network):** If no local match, queries the NLM RxNorm API (`rxnav.nlm.nih.gov/REST`) to resolve international generic names to US names (e.g., paracetamol → acetaminophen, salbutamol → albuterol). Two requests: `rxcui.json?name=...` → `rxcui/{id}/properties.json`. Returns `{ type: 'international', generic: "acetaminophen", original: "paracetamol" }`. Fails silently if RxNorm is unavailable.
3. **No match:** Returns unresolved — original input is used directly for the NCBI search.
4. **Display:** `<BrandBadge>` shows contextual text: "is a brand name for" (brand type) or "is also known as" (international type).

### Key Patterns

- **Debounced search:** 350ms debounce in `App.jsx` (0ms for deep links). Uses `AbortController` for request cancellation.
- **Accordion:** Only one monograph section open at a time in DrugCard.
- **Cache warming:** `main.jsx` prefetches 8 common drug searches 5s after first visit with 1s gaps. Hits `/api/search` which populates CF edge cache.
- **State:** All search state lives in `App.jsx` via `useState`. No global state library.
- **Deep links:** `?drug=Ibuprofen` URL param — auto-selects exact match from results.
- **Recent searches:** Last 10 viewed drugs stored in `localStorage` (`lactia-recent-searches`). Displayed as teal pills on HomePage above common searches. Single-result saves are debounced 1s (avoids mid-type captures); multi-result taps save immediately. `src/lib/recentSearches.js` exports `getRecentSearches()`, `addRecentSearch(name)`, and `clearRecentSearches()`.
- **Search analytics (KV):** Drug views are counted in Cloudflare KV via a dedicated `/api/count?q={drugName}` endpoint (`functions/api/count.js`). Client calls it only when a user actually views a drug (multi-result tap or single-result auto-display with 1s debounce), logging canonical drug titles — not raw query fragments. The `SEARCH_COUNTS` KV namespace is bound via CF dashboard (Settings → Bindings). Fire-and-forget via `context.waitUntil()`. Free tier: 1,000 writes/day. Service worker skips this endpoint (no caching needed).

### Data Schema (NCBI E-utilities → UI)

| Parsed Field | Source XML Element | Description |
|---|---|---|
| title | `<ArticleTitle>` | Drug name (chapter title) |
| summary | `<AbstractText>` | Safety overview |
| lastUpdated | `<ContributionDate>` Y/M/D | Last revision date |
| bookshelfId | `<ArticleId IdType="bookaccession">` | NCBI Bookshelf ID (e.g., "NBK500986") |

## Key Files

- `src/api/lactmed.js` — Thin client wrapper; single fetch to `/api/search` server proxy
- `src/api/monograph.js` — Client-side fetch wrapper for monograph proxy
- `src/api/brandResolver.js` — Async brand + international name resolution
- `src/components/DrugCard.jsx` — Drug result card with expandable monograph subsections + external links
- `src/components/FormattedText.jsx` — Structured text rendering: paragraphs, bold sub-headings, bullet lists, word-break for URLs
- `src/components/ExternalLinks.jsx` — MotherToBaby (US) breastfeeding fact sheets (verified slugs) + Matria pregnancy cross-link
- `src/components/BrandBadge.jsx` — Shows "is a brand name for" or "is also known as"
- `src/components/HomePage.jsx` — Home page: recent searches (localStorage, teal pills) + common searches + about section
- `src/components/SearchBar.jsx` — Sticky frosted glass header with Lactia logo + search input + sister site nav (Matria, nicutools)
- `src/data/brandToGeneric.json` — Static brand-to-generic mappings (~400 entries)
- `src/data/motherToBabyLinks.json` — Verified MotherToBaby fact sheet slugs (~320)
- `src/data/drugTitles.json` — Bundled LactMed chapter titles (~1,920) for autocomplete + build-time sitemap. **Not safety data** — monographs are fetched live via the proxy, so this can never make safety info stale.
- `scripts/fetch-titles.mjs` — Fetches all LactMed chapter titles from NCBI E-utilities → `drugTitles.json`. Fails loudly by design (throws on 0 results; refuses to write a <1,000-title index), so it can't silently pin stale data.
- `.github/workflows/refresh-titles.yml` — Monthly (2nd, 04:17 UTC) + on push to the fetch script: runs `fetch-titles`, commits `drugTitles.json` **only when it changes**.
- `.github/workflows/keepalive.yml` — Empty `[skip ci]` commit on the 1st & 22nd of each month to prevent GitHub's 60-day scheduled-workflow auto-disable (see Gotchas). Self-sustaining; no third-party actions.
- `functions/api/search.js` — Cloudflare Pages Function (server-side NCBI search proxy, regex XML parsing, 1h edge cache)
- `functions/api/monograph.js` — Cloudflare Pages Function (HTMLRewriter proxy + entity decoding + sub-heading insertion)
- `functions/api/count.js` — Cloudflare Pages Function (lightweight KV analytics — logs canonical drug titles on view)
- `src/App.jsx` — Main app: search state, compact result list, selection, correction banner, `logDrugView()` analytics

## Development Rules

- **Mobile first:** All layouts optimized for single-hand iPhone use. 44px touch targets (`min-h-11`), `rounded-2xl` corners.
- **Atomic components:** Keep UI logic separate from data fetching logic.
- **Safety:** Display `last_updated` prominently on every drug card.
- **Disclaimer:** NLM liability disclaimer must be visible in footer of all results.
- **Design:** Teal accents (`teal-600/500/400`), slate neutrals, `sky-900` headings (light mode), frosted glass header (`backdrop-blur-md`).

## Gotchas

- NCBI rate-limited to 3 req/sec without API key, 10 req/sec with key. `NCBI_API_KEY` must be set as a CF Pages secret. Spell-correction path makes up to 7 NCBI calls per search — will 429 without the key. `ncbiFetch()` retries once on 429. Cache warming uses 1s delays between drugs.
- RxNorm doesn't resolve brand names — only international generics. Local JSON handles brands.
- RxNorm results containing commas are rejected (e.g., "insulin" → "insulin, regular, human") — these are formulation names, not clean generic mappings, and fail LactMed search.
- NCBI Bookshelf section IDs: `[id$=".Section_Name"]` for exact match, `[id*=".Effects_on_Lactation"]` for truncation variant.
- `HTMLRewriter` text handlers receive all descendant text (a `<p>` handler captures text from child `<i>`, `<a>`, etc.).
- Vite warns about `lactmed.js` being both statically and dynamically imported — harmless, cache warming still works.
- For local dev **with** CF Pages Functions, you must use `wrangler pages dev` (not plain `npm run dev`).
- **GitHub 60-day auto-disable:** Scheduled workflows are auto-disabled after 60 days of *repository inactivity* (no commits — scheduled runs don't count). `refresh-titles` commits only when titles change, so a quiet stretch could disable it and silently stop refreshes. `keepalive.yml` pushes an empty commit twice monthly to reset the clock. If a "workflow disabled" email still arrives, re-enable with `gh workflow enable <id> -R nicutools/LactMed` (find the id via `gh workflow list --all -R nicutools/LactMed`).

## Links

- **Live:** https://lactia.nicutools.org / https://lactia.pages.dev
- **Repo:** https://github.com/nicutools/LactMed
- **Analytics:** GA4 `G-070WW9RLH0`
- **Search counts:** CF KV namespace `SEARCH_COUNTS` (id: `ef519c9d599344d0bca4c05f6ad7953f`)

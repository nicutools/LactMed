# CLAUDE.md — Project: LactCheck

## 1. Vision & Strategy
**Purpose:** A high-performance, mobile-first web interface for the NLM LactMed® database.

**Target Users:** Parents and healthcare providers needing instant drug-lactation safety info.

**Development Philosophy:** Phase 1 (Lite) focuses on a lightweight, fast experience hosted on Cloudflare Pages. Phase 2 (Full) introduces a local mirror for offline PWA capabilities.

## 2. Technology Stack (Phase 1: Lite)
- **Frontend:** React (Vite) + Tailwind CSS
- **Hosting:** Cloudflare Pages (static assets + Pages Functions)
- **Data Source:** Live fetch from NCBI E-utilities API (ESearch → ELink → EFetch)
- **Monograph Proxy:** Cloudflare Pages Function (`/api/monograph`) fetches full monograph HTML from NCBI Bookshelf, extracts subsections with `HTMLRewriter`, returns JSON
- **Spell Check:** NCBI ESpell API — auto-corrects misspelled drug names when search returns zero results
- **State Management:** Standard React useState (transitioning to TanStack Query later)
- **Deploy:** `npm run build && npx wrangler pages deploy dist`

## 3. Core Architecture (Lite)

### A. Live Search Workflow (NCBI E-utilities)
1. **User Input:** User enters a drug or brand name (e.g., "Ibuprofen" or "Nurofen").
2. **Search Strategy (3-tier with fallback):**
   - **Tier 1 — Title search:** `{query}*[title] AND lactmed[book] AND chapter[type]` with `retmax=100`. Returns only drugs whose name matches (precise, alphabetical). Handles most searches.
   - **Tier 2 — Broad search:** If title search returns 0 results, retries without `[title]`. Catches partial international names (e.g., "parace" finds Acetaminophen via body text mention of "paracetamol").
   - **Tier 3 — Spell correction:** If both searches return 0, calls NCBI ESpell API (`espell.fcgi`). If a correction is found (e.g., "fluoxatine" → "fluoxetine"), re-searches with the corrected term. UI shows "Showing results for **fluoxetine**".
3. **Pipeline:** ESearch → ELink (books→pubmed) → EFetch (XML). Results sorted alphabetically by title.
4. **Display:**
   - **Multiple results:** Compact title list ("9 results — tap to view"). User taps a drug name to see full card. "All results" button to return to list.
   - **Single result:** Full DrugCard shown directly.
   - Mandatory NLM disclaimer in footer.

### B. Monograph Subsections (Cloudflare Pages Function)
DrugCard has a "Show details" button that lazy-loads full monograph subsections on first tap:
1. **Endpoint:** `/api/monograph?id=NBK500986` — Cloudflare Pages Function at `functions/api/monograph.js`
2. **Server-side:** Fetches `ncbi.nlm.nih.gov/books/{id}/`, uses `HTMLRewriter` (Cloudflare's built-in streaming HTML parser) to extract 4 subsections by CSS attribute selectors:
   - `div[id$=".Drug_Levels"]` → drugLevels
   - `div[id$=".Effects_in_Breastfed_Infants"]` → effectsInfant
   - `div[id*=".Effects_on_Lactation"]` → effectsLactation (contains-match handles truncation variant)
   - `div[id$=".Alternate_Drugs_to_Consider"]` → alternatives
3. **Caching:** `Cache-Control: public, max-age=86400` (24h CDN cache)
4. **Client:** `src/api/monograph.js` fetches the endpoint; DrugCard caches the result in component state for instant re-toggle

### C. Name Resolution (Brand + International Generic)
`resolveBrand(query, signal)` is async and uses a two-tier strategy:
1. **Local brand mapping (instant):** Checks `src/data/brandToGeneric.json` (~400 AU/UK/US brand-to-generic mappings, bundled at build time). Returns `{ type: 'brand', generic: "ibuprofen", original: "Nurofen" }`.
2. **RxNorm API fallback (network):** If no local match, queries the NLM RxNorm API (`rxnav.nlm.nih.gov/REST`) to resolve international generic names to US names (e.g., paracetamol → acetaminophen, salbutamol → albuterol). Two requests: `rxcui.json?name=...` → `rxcui/{id}/properties.json`. Returns `{ type: 'international', generic: "acetaminophen", original: "paracetamol" }`. Fails silently if RxNorm is unavailable.
3. **No match:** Returns unresolved — original input is used directly for the NCBI search.
4. **Display:** `<BrandBadge>` shows contextual text: "is a brand name for" (brand type) or "is also known as" (international type).

## 4. Roadmap to Phase 2 (Full)
When ready to scale, we will introduce:
- **Data Mirror:** A Python script to sync all ~1,800 records into a Supabase (Postgres) database.
- **Local Fuzzy Search:** Bundle all drug names for instant client-side fuzzy matching (Fuse.js or similar). Complements the server-side ESpell with offline-capable, as-you-type suggestions.
- **Brand Mapping:** RxNorm integration is already live for international generics; could be extended for brand-name resolution too (currently returns empty for brands like "Nurofen").
- **PWA:** Service workers to cache the database in IndexedDB for offline hospital use.

## 5. Data Schema Mapping (NCBI E-utilities)
| Parsed Field | Source XML Element | UI Label | Description |
| :--- | :--- | :--- | :--- |
| title | `<ArticleTitle>` | Drug Name | The substance name (chapter title). |
| summary | `<AbstractText>` | Summary | Overview of safety and use. |
| lastUpdated | `<ContributionDate>` Y/M/D | Updated date | Date the monograph was last revised. |
| bookshelfId | `<ArticleId IdType="bookaccession">` | Monograph link | NCBI Bookshelf ID (e.g., "NBK500986") for full monograph URL. |

## 6. Key Files
- `src/api/lactmed.js` — ESearch (title→broad→espell fallback), ELink, EFetch pipeline
- `src/api/monograph.js` — Client-side fetch wrapper for monograph proxy
- `src/api/brandResolver.js` — Async brand + international name resolution
- `src/components/DrugCard.jsx` — Drug result card with expandable monograph subsections
- `src/components/BrandBadge.jsx` — Shows "is a brand name for" or "is also known as"
- `src/data/brandToGeneric.json` — Static brand-to-generic mappings (~400 entries)
- `functions/api/monograph.js` — Cloudflare Pages Function (HTMLRewriter proxy)
- `src/App.jsx` — Main app: search state, compact result list, selection, correction banner

## 7. Development Rules for Claude Code
- **Atomic Components:** Keep UI logic separate from data fetching logic.
- **Mobile First:** All layouts must be optimized for single-hand use on an iPhone.
- **Safety:** Display the `last_updated` field prominently on every drug card.
- **Disclaimer:** The NLM liability disclaimer must be visible in the footer of all results.
- **Deploy:** `npm run build && npx wrangler pages deploy dist` (Cloudflare Pages).
- **Local dev with functions:** `npm run build && npx wrangler pages dev dist`

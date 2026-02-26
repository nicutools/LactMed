# CLAUDE.md — Project: LactCheck

## 1. Vision & Strategy
**Purpose:** A high-performance, mobile-first web interface for the NLM LactMed® database.

**Target Users:** Parents and healthcare providers needing instant drug-lactation safety info.

**Development Philosophy:** Phase 1 (Lite) focuses on zero-infrastructure "Live Search." Phase 2 (Full) introduces a local mirror for brand-name mapping and offline PWA capabilities.

## 2. Technology Stack (Phase 1: Lite)
- **Frontend:** React (Vite) + Tailwind CSS
- **Data Source:** Live fetch from NCBI E-utilities API (ESearch → ELink → EFetch)
- **State Management:** Standard React useState for search results (transitioning to TanStack Query later)

## 3. Core Architecture (Lite)

### A. Live Search Workflow (NCBI E-utilities)
1. **User Input:** User enters a drug or brand name (e.g., "Ibuprofen" or "Nurofen").
2. **API Pipeline:** Three sequential requests to NCBI E-utilities (all CORS-enabled, no API key required):
   - **ESearch:** `eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=books&term={query}*[title] AND lactmed[book] AND chapter[type]` → returns book UIDs
   - **ELink:** `eutils.ncbi.nlm.nih.gov/entrez/eutils/elink.fcgi?dbfrom=books&db=pubmed&id=...` → maps UIDs to PMIDs (filter by `linkname === "books_pubmed"`)
   - **EFetch:** `eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&retmode=xml&id=...` → returns XML with article title, abstract, date, and bookshelf ID
3. **Display:** Results are rendered in a card layout showing title, summary, last-updated date, and a link to the full NCBI Bookshelf monograph. The mandatory NLM disclaimer is shown in the footer.
4. **Limitation:** E-utilities only provide the summary/abstract. Detailed subsections (Drug Levels, Effects on Infants, Alternatives) are available via the "View full monograph" link. Full subsection data can be added in Phase 2 via a server proxy.

### B. Brand Name Resolution
1. **User Input:** User enters a brand name (e.g., "Nurofen") or generic name.
2. **Client-Side Lookup:** `resolveBrand(query)` checks `src/data/brandToGeneric.json` for a match.
   - If found: returns `{ resolved: true, generic: "ibuprofen", originalBrand: "Nurofen" }`.
   - If not found: returns `{ resolved: false, generic: originalInput, originalBrand: null }` — the original input falls through to the NLM API directly.
3. **Display:** When a brand is resolved, a `<BrandBadge>` info banner shows the mapping (e.g., "Nurofen is a brand name for ibuprofen"). The resolved generic name is used for the NLM API search.
4. **Data:** `brandToGeneric.json` contains ~400 pre-lowercased AU/UK/US brand-to-generic mappings bundled at build time (zero-infrastructure).

## 4. Roadmap to Phase 2 (Full)
When ready to scale, we will introduce:
- **Data Mirror:** A Python script to sync all ~1,800 records into a Supabase (Postgres) database.
- **Full Subsection Data:** A server proxy to fetch and parse the full LactMed monograph XML, exposing Drug Levels, Effects on Infants, and Alternatives subsections that are not available via E-utilities alone.
- **Brand Mapping:** Integration with the RxNorm API to allow searches by brand names (e.g., "Advil" → "Ibuprofen").
- **PWA:** Service workers to cache the database in IndexedDB for offline hospital use.

## 5. Data Schema Mapping (NCBI E-utilities)
| Parsed Field | Source XML Element | UI Label | Description |
| :--- | :--- | :--- | :--- |
| title | `<ArticleTitle>` | Drug Name | The substance name (chapter title). |
| summary | `<AbstractText>` | Summary | Overview of safety and use. |
| lastUpdated | `<ContributionDate>` Y/M/D | Updated date | Date the monograph was last revised. |
| bookshelfId | `<ArticleId IdType="bookaccession">` | Monograph link | NCBI Bookshelf ID (e.g., "NBK500986") for full monograph URL. |

## 6. Development Rules for Claude Code
- **Atomic Components:** Keep UI logic separate from data fetching logic.
- **Mobile First:** All layouts must be optimized for single-hand use on an iPhone.
- **Safety:** Display the `last_updated` field prominently on every drug card.
- **Disclaimer:** The NLM liability disclaimer must be visible in the footer of all results.

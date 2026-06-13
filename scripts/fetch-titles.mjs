#!/usr/bin/env node
// Fetches all LactMed chapter titles from NCBI E-utilities and writes
// src/data/drugTitles.json — used for client-side autocomplete suggestions
// and build-time sitemap generation.
//
// Usage: npm run fetch-titles
// Optional: set NCBI_API_KEY to raise the NCBI rate limit (3 → 10 req/sec).
//
// Also run automatically by .github/workflows/refresh-titles.yml (monthly).

import { writeFileSync } from 'node:fs';

const EUTILS = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const API_KEY = process.env.NCBI_API_KEY || '';
const OUT = 'src/data/drugTitles.json';
const CHUNK = 400;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ncbiJson(endpoint, params) {
  const qs = new URLSearchParams({
    ...params,
    retmode: 'json',
    ...(API_KEY && { api_key: API_KEY }),
  });
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${EUTILS}/${endpoint}?${qs}`);
    if (res.status === 429 && attempt < 3) {
      await sleep(500 * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new Error(`${endpoint} failed: HTTP ${res.status}`);
    return res.json();
  }
}

// Front-matter chapters that aren't drug monographs
const NON_DRUG =
  /^(about lactmed|preface|introduction|appendix|glossary|abbreviations|disclaimer|drug entries|finding)/i;

const search = await ncbiJson('esearch.fcgi', {
  db: 'books',
  term: 'lactmed[book] AND chapter[type]',
  retmax: '10000',
});
const ids = search.esearchresult?.idlist || [];
if (ids.length === 0) throw new Error('ESearch returned no LactMed chapters');
console.log(`Found ${ids.length} LactMed chapters`);

const titles = [];
for (let i = 0; i < ids.length; i += CHUNK) {
  const chunk = ids.slice(i, i + CHUNK);
  const summary = await ncbiJson('esummary.fcgi', {
    db: 'books',
    id: chunk.join(','),
  });
  for (const uid of summary.result?.uids || []) {
    const title = summary.result[uid]?.title?.trim();
    if (title && !NON_DRUG.test(title)) titles.push(title);
  }
  console.log(`  fetched ${Math.min(i + CHUNK, ids.length)}/${ids.length}`);
  await sleep(API_KEY ? 150 : 400);
}

const unique = [...new Set(titles)].sort((a, b) => a.localeCompare(b));
if (unique.length < 1000) {
  throw new Error(
    `Only ${unique.length} titles extracted — refusing to write a suspiciously small index`,
  );
}
writeFileSync(OUT, JSON.stringify(unique, null, 2) + '\n');
console.log(`Wrote ${unique.length} titles to ${OUT}`);

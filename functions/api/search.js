const EUTILS_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const query = url.searchParams.get('q');

  if (!query || !query.trim()) {
    return Response.json(
      { error: 'Missing or empty "q" parameter.' },
      { status: 400 },
    );
  }

  const apiKey = context.env?.NCBI_API_KEY || null;
  const q = sanitizeQuery(query);

  if (!q) {
    return Response.json(
      { error: 'Query contains no searchable characters.' },
      { status: 400 },
    );
  }

  try {
    // Tier 1: title search
    let uids = await esearch(q, true, apiKey);

    // Tier 2: broad search
    if (uids.length === 0) {
      uids = await esearch(q, false, apiKey);
    }

    // Tier 3: spell correction
    if (uids.length === 0) {
      const corrected = await espell(q, apiKey);
      if (corrected) {
        uids = await esearch(corrected, true, apiKey);
        if (uids.length === 0) {
          uids = await esearch(corrected, false, apiKey);
        }
        if (uids.length > 0) {
          const results = await fetchResults(uids, apiKey);
          return jsonResponse({ results, correction: corrected });
        }
      }
      return jsonResponse({ results: [], correction: null });
    }

    const results = await fetchResults(uids, apiKey);
    return jsonResponse({ results, correction: null });
  } catch (err) {
    return Response.json(
      { error: err.message || 'Search failed.' },
      { status: 502 },
    );
  }
}

function jsonResponse(data) {
  return Response.json(data, {
    headers: {
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}

// Strip characters with special meaning in NCBI term syntax (brackets,
// quotes, parens, booleans are left as plain words) so user input can't
// distort the query. Exported for tests.
export function sanitizeQuery(raw) {
  return raw
    .replace(/[^\p{L}\p{N}\s.,'-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// --- NCBI E-utilities helpers ---

async function ncbiFetch(url) {
  let res = await fetch(url);
  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 350));
    res = await fetch(url);
  }
  return res;
}

async function esearch(query, titleOnly, apiKey) {
  const field = titleOnly ? '[title]' : '';
  const term = `${query}*${field} AND lactmed[book] AND chapter[type]`;
  const params = new URLSearchParams({
    db: 'books',
    term,
    retmode: 'json',
    retmax: '100',
    ...(apiKey && { api_key: apiKey }),
  });
  const res = await ncbiFetch(`${EUTILS_BASE}/esearch.fcgi?${params}`);
  if (!res.ok) throw new Error(`ESearch error: ${res.status}`);
  const data = await res.json();
  return data.esearchresult?.idlist || [];
}

async function espell(query, apiKey) {
  const params = new URLSearchParams({
    db: 'books',
    term: query,
    ...(apiKey && { api_key: apiKey }),
  });
  const res = await ncbiFetch(`${EUTILS_BASE}/espell.fcgi?${params}`);
  if (!res.ok) return null;
  const xml = await res.text();
  const match = xml.match(/<CorrectedQuery>([^<]+)<\/CorrectedQuery>/);
  if (!match) return null;
  const corrected = match[1];
  return corrected.toLowerCase() !== query.toLowerCase() ? corrected : null;
}

async function fetchResults(uids, apiKey) {
  // ELink — map book UIDs to PubMed IDs
  const linkParams = new URLSearchParams({
    dbfrom: 'books',
    db: 'pubmed',
    retmode: 'json',
    ...(apiKey && { api_key: apiKey }),
  });
  uids.forEach((id) => linkParams.append('id', id));

  const linkRes = await ncbiFetch(`${EUTILS_BASE}/elink.fcgi?${linkParams}`);
  if (!linkRes.ok) throw new Error(`ELink error: ${linkRes.status}`);

  const linkData = await linkRes.json();
  const pmids = [];
  for (const linkSet of linkData.linksets || []) {
    for (const db of linkSet.linksetdbs || []) {
      if (db.linkname === 'books_pubmed') {
        for (const link of db.links || []) {
          pmids.push(link);
        }
      }
    }
  }
  if (pmids.length === 0) return [];

  // EFetch — get full article data from PubMed
  const fetchParams = new URLSearchParams({
    db: 'pubmed',
    retmode: 'xml',
    ...(apiKey && { api_key: apiKey }),
  });
  pmids.forEach((id) => fetchParams.append('id', id));

  const fetchRes = await ncbiFetch(`${EUTILS_BASE}/efetch.fcgi?${fetchParams}`);
  if (!fetchRes.ok) throw new Error(`EFetch error: ${fetchRes.status}`);

  const xml = await fetchRes.text();
  return parseArticles(xml).sort((a, b) => a.title.localeCompare(b.title));
}

// Exported for tests.
export function parseArticles(xml) {
  const results = [];
  // Split on PubmedBookArticle boundaries
  const articles = xml.split(/<PubmedBookArticle[\s>]/);

  for (let i = 1; i < articles.length; i++) {
    const chunk = articles[i];

    const title = extractTag(chunk, 'ArticleTitle') || '';
    const summary = extractTag(chunk, 'AbstractText') || '';

    // Parse ContributionDate — NIH's own revision date for this monograph.
    let lastUpdated = null;
    const dateBlock = chunk.match(/<ContributionDate>([\s\S]*?)<\/ContributionDate>/);
    if (dateBlock) {
      lastUpdated = toIsoDate(
        extractTag(dateBlock[1], 'Year'),
        extractTag(dateBlock[1], 'Month'),
        extractTag(dateBlock[1], 'Day'),
      );
    }

    // Extract bookaccession ID
    let bookshelfId = null;
    const accMatch = chunk.match(/<ArticleId IdType="bookaccession">([^<]+)<\/ArticleId>/);
    if (accMatch) bookshelfId = accMatch[1];

    results.push({ title, summary, lastUpdated, bookshelfId });
  }

  return results;
}

const MONTH_NAMES = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

// Builds an ISO YYYY-MM-DD date from PubMed's separate Year/Month/Day tags.
//
// PubMed is not consistent about <Month>: most records use a number, but some
// use a name ("Apr", "April"). The previous code did `m.padStart(2, '0')`
// unconditionally, which turned "Apr" into "2026-Apr-15" — a string that then
// rendered as "Invalid Date" on the drug card. Anything that isn't a real
// calendar date returns null, so the card shows no date rather than a wrong one.
//
// Exported for tests.
export function toIsoDate(year, month, day) {
  if (!year || !month || !day) return null;

  const y = Number(year);
  if (!Number.isInteger(y) || y < 1900 || y > 2200) return null;

  const rawMonth = String(month).trim();
  const m = /^\d+$/.test(rawMonth)
    ? Number(rawMonth)
    : MONTH_NAMES[rawMonth.slice(0, 3).toLowerCase()];
  if (!Number.isInteger(m) || m < 1 || m > 12) return null;

  const d = Number(String(day).trim());
  if (!Number.isInteger(d) || d < 1 || d > 31) return null;

  // Reject dates that don't round-trip, e.g. 31 February.
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (
    probe.getUTCFullYear() !== y ||
    probe.getUTCMonth() !== m - 1 ||
    probe.getUTCDate() !== d
  ) {
    return null;
  }

  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function extractTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return match ? match[1].trim() : null;
}

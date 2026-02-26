const EUTILS_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const API_KEY = import.meta.env.VITE_NCBI_API_KEY;

export async function searchDrugs(query, signal) {
  if (!query.trim()) return [];

  // Step 1: ESearch — find LactMed book chapter UIDs matching the query
  const searchTerm = `${query}* AND lactmed[book] AND chapter[type]`;
  const searchParams = new URLSearchParams({
    db: 'books',
    term: searchTerm,
    retmode: 'json',
    retmax: '20',
    ...(API_KEY && { api_key: API_KEY }),
  });

  const searchRes = await fetch(`${EUTILS_BASE}/esearch.fcgi?${searchParams}`, { signal });
  if (!searchRes.ok) throw new Error(`ESearch error: ${searchRes.status}`);

  const searchData = await searchRes.json();
  const uids = searchData.esearchresult?.idlist || [];
  if (uids.length === 0) return [];

  // Step 2: ELink — map book UIDs to PubMed IDs
  const linkParams = new URLSearchParams({
    dbfrom: 'books',
    db: 'pubmed',
    retmode: 'json',
    ...(API_KEY && { api_key: API_KEY }),
  });
  uids.forEach(id => linkParams.append('id', id));

  const linkRes = await fetch(`${EUTILS_BASE}/elink.fcgi?${linkParams}`, { signal });
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

  // Step 3: EFetch — get full article data from PubMed
  const fetchParams = new URLSearchParams({
    db: 'pubmed',
    retmode: 'xml',
    ...(API_KEY && { api_key: API_KEY }),
  });
  pmids.forEach(id => fetchParams.append('id', id));

  const fetchRes = await fetch(`${EUTILS_BASE}/efetch.fcgi?${fetchParams}`, { signal });
  if (!fetchRes.ok) throw new Error(`EFetch error: ${fetchRes.status}`);

  const xml = await fetchRes.text();
  return parseArticles(xml);
}

function parseArticles(xml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const articles = doc.querySelectorAll('PubmedBookArticle');
  const results = [];

  for (const article of articles) {
    const title = article.querySelector('ArticleTitle')?.textContent || '';
    const summary = article.querySelector('AbstractText')?.textContent || '';

    // Parse ContributionDate for lastUpdated
    const contribDate = article.querySelector('ContributionDate');
    let lastUpdated = null;
    if (contribDate) {
      const y = contribDate.querySelector('Year')?.textContent;
      const m = contribDate.querySelector('Month')?.textContent?.padStart(2, '0');
      const d = contribDate.querySelector('Day')?.textContent?.padStart(2, '0');
      if (y && m && d) lastUpdated = `${y}-${m}-${d}`;
    }

    // Extract bookaccession ID (e.g. "NBK500986")
    let bookshelfId = null;
    const articleIds = article.querySelectorAll('ArticleId');
    for (const aid of articleIds) {
      if (aid.getAttribute('IdType') === 'bookaccession') {
        bookshelfId = aid.textContent;
        break;
      }
    }

    results.push({ title, summary, lastUpdated, bookshelfId });
  }

  return results;
}

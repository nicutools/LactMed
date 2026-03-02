export async function searchDrugs(query, signal) {
  if (!query.trim()) return { results: [], correction: null };
  const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, { signal });
  if (!res.ok) throw new Error(`Search error: ${res.status}`);
  return res.json();
}

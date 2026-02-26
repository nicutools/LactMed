export async function fetchMonograph(bookshelfId, signal) {
  const res = await fetch(
    `/api/monograph?id=${encodeURIComponent(bookshelfId)}`,
    { signal },
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return res.json();
}

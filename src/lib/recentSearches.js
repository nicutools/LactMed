const STORAGE_KEY = 'lactia-recent-searches';

export function getRecentSearches() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

export function addRecentSearch(name) {
  const recent = getRecentSearches().filter(
    (d) => d.toLowerCase() !== name.toLowerCase()
  );
  recent.unshift(name);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recent.slice(0, 10)));
}

export function clearRecentSearches() {
  localStorage.removeItem(STORAGE_KEY);
}

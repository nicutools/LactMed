import { useState, useEffect, useRef } from 'react';
import SearchBar from './components/SearchBar';
import DrugCard from './components/DrugCard';
import BrandBadge from './components/BrandBadge';
import Disclaimer from './components/Disclaimer';
import { searchDrugs } from './api/lactmed';
import { resolveBrand } from './api/brandResolver';

function App() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resolution, setResolution] = useState(null);
  const [searched, setSearched] = useState(false);
  const [correction, setCorrection] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);

    const trimmed = query.trim();

    if (!trimmed) {
      setResults([]);
      setError(null);
      setResolution(null);
      setSearched(false);
      return;
    }

    if (trimmed.length < 3) {
      setResults([]);
      setError(null);
      setResolution(null);
      setSearched(false);
      return;
    }

    // Show loading immediately so "No results found" doesn't flash during debounce
    setLoading(true);
    setResults([]);
    setError(null);
    setSearched(false);
    setCorrection(null);
    setSelectedIndex(null);

    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const brandResult = await resolveBrand(query, controller.signal);
        setResolution(brandResult.resolved ? brandResult : null);

        const { results: data, correction: corrected } = await searchDrugs(brandResult.generic, controller.signal);
        setResults(data);
        setCorrection(corrected);
        setSearched(true);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Search error:', err);
          setError('Unable to reach the LactMed database. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  return (
    <div className="min-h-screen bg-slate-50">
      <SearchBar query={query} onChange={setQuery} />

      <main className="mx-auto max-w-lg px-4 py-4">
        {resolution && (
          <BrandBadge
            original={resolution.original}
            generic={resolution.generic}
            type={resolution.type}
          />
        )}

        {correction && (
          <p className="mb-3 text-sm text-slate-500">
            Showing results for <span className="font-semibold text-slate-700">{correction}</span>
          </p>
        )}

        {loading && (
          <p className="py-12 text-center text-sm text-slate-400">
            Searching...
          </p>
        )}

        {error && (
          <p className="py-12 text-center text-sm text-red-500">{error}</p>
        )}

        {!loading && !error && searched && results.length === 0 && (
          <p className="py-12 text-center text-sm text-slate-400">
            No results found. Try a drug or brand name (e.g. "Ibuprofen").
          </p>
        )}

        {!loading && !error && query.trim().length > 0 && query.trim().length < 3 && (
          <p className="py-12 text-center text-sm text-slate-400">
            Type at least 3 characters to search.
          </p>
        )}

        {!loading && !error && !query.trim() && (
          <p className="py-12 text-center text-sm text-slate-400">
            Enter a drug or brand name to check breastfeeding safety info.
          </p>
        )}

        {results.length === 1 && (
          <DrugCard drug={results[0]} />
        )}

        {results.length > 1 && selectedIndex === null && (
          <div className="flex flex-col gap-1">
            <p className="mb-2 text-xs text-slate-400">
              {results.length} results — tap to view
            </p>
            {results.map((drug, i) => (
              <button
                key={drug.title || i}
                onClick={() => setSelectedIndex(i)}
                className="w-full rounded-xl bg-white px-4 py-3 text-left text-sm font-medium text-slate-800 shadow-sm active:bg-slate-50"
              >
                {drug.title}
              </button>
            ))}
          </div>
        )}

        {results.length > 1 && selectedIndex !== null && (
          <div>
            <button
              onClick={() => setSelectedIndex(null)}
              className="mb-3 flex items-center gap-1 text-sm font-medium text-blue-600 active:text-blue-800"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              All results
            </button>
            <DrugCard drug={results[selectedIndex]} />
          </div>
        )}

        {results.length > 0 && <Disclaimer />}
      </main>
    </div>
  );
}

export default App;

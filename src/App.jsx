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
  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);

    const trimmed = query.trim();

    if (!trimmed) {
      setResults([]);
      setError(null);
      setResolution(null);
      return;
    }

    if (trimmed.length < 3) {
      setResults([]);
      setError(null);
      setResolution(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const brandResult = await resolveBrand(query, controller.signal);
        setResolution(brandResult.resolved ? brandResult : null);

        const data = await searchDrugs(brandResult.generic, controller.signal);
        setResults(data);
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

        {loading && (
          <p className="py-12 text-center text-sm text-slate-400">
            Searching...
          </p>
        )}

        {error && (
          <p className="py-12 text-center text-sm text-red-500">{error}</p>
        )}

        {!loading && !error && query.trim().length >= 3 && results.length === 0 && (
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

        <div className="flex flex-col gap-4">
          {results.map((drug, i) => (
            <DrugCard key={drug.title || i} drug={drug} />
          ))}
        </div>

        {results.length > 0 && <Disclaimer />}
      </main>
    </div>
  );
}

export default App;

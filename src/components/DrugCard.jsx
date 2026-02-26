import { useState, useRef, useEffect } from 'react';
import { fetchMonograph } from '../api/monograph';
import ShareButton from './ShareButton';

const SECTIONS = [
  { key: 'drugLevels', label: 'Drug Levels' },
  { key: 'effectsInfant', label: 'Effects in Breastfed Infants' },
  { key: 'effectsLactation', label: 'Effects on Lactation and Breastmilk' },
  { key: 'alternatives', label: 'Alternate Drugs to Consider' },
];

export default function DrugCard({ drug }) {
  const updated = drug.lastUpdated
    ? new Date(drug.lastUpdated).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  const [monograph, setMonograph] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [openSections, setOpenSections] = useState({});
  const abortRef = useRef(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  async function ensureMonograph() {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchMonograph(drug.bookshelfId, controller.signal);
      setMonograph(data);
    } catch (err) {
      if (err.name !== 'AbortError') {
        fetchedRef.current = false;
        setError('Unable to load monograph details.');
      }
    } finally {
      setLoading(false);
    }
  }

  function toggleSection(key) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
    ensureMonograph();
  }

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-lg font-semibold text-sky-900">
          {drug.title}
        </h2>
        {updated && (
          <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-500">
            Updated {updated}
          </span>
        )}
      </div>

      {drug.summary && (
        <div className="mt-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Summary
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-zinc-700">{drug.summary}</p>
        </div>
      )}

      {drug.bookshelfId && (
        <div className="mt-4 divide-y divide-zinc-100 rounded-xl border border-zinc-200">
          {SECTIONS.map(({ key, label }) => {
            const isOpen = openSections[key];
            const content = monograph?.[key];
            const hasContent = monograph && !content;

            return (
              <div key={key}>
                <button
                  onClick={() => toggleSection(key)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-zinc-700 active:bg-zinc-50"
                >
                  {label}
                  <svg
                    className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
                {isOpen && (
                  <div className="px-4 pb-3">
                    {loading && (
                      <p className="py-2 text-sm text-zinc-400">Loading...</p>
                    )}
                    {error && (
                      <p className="py-2 text-sm text-red-500">{error}</p>
                    )}
                    {content && (
                      <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-600">
                        {content}
                      </p>
                    )}
                    {hasContent && !loading && !error && (
                      <p className="py-2 text-sm text-zinc-400">No data available.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        {drug.bookshelfId && (
          <a
            href={`https://www.ncbi.nlm.nih.gov/books/${drug.bookshelfId}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-sky-600 hover:text-sky-800"
          >
            View full monograph &rarr;
          </a>
        )}
        <ShareButton drugTitle={drug.title} />
      </div>
    </article>
  );
}

import { useState, useRef, useEffect } from 'react';
import { fetchMonograph } from '../api/monograph';

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

  const [expanded, setExpanded] = useState(false);
  const [monograph, setMonograph] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  async function handleToggle() {
    if (expanded) {
      setExpanded(false);
      return;
    }

    setExpanded(true);

    if (monograph) return;

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
        setError('Unable to load monograph details.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-800">
          {drug.title}
        </h2>
        {updated && (
          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">
            Updated {updated}
          </span>
        )}
      </div>

      {drug.summary && (
        <div className="mt-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Summary
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">{drug.summary}</p>
        </div>
      )}

      {drug.bookshelfId && (
        <button
          onClick={handleToggle}
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-50 py-2.5 text-sm font-medium text-slate-600 active:bg-slate-100"
        >
          <svg
            className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
          {expanded ? 'Hide details' : 'Show details'}
        </button>
      )}

      {expanded && (
        <div className="mt-4 space-y-4">
          {loading && (
            <p className="py-4 text-center text-sm text-slate-400">Loading details...</p>
          )}

          {error && (
            <p className="py-4 text-center text-sm text-red-500">{error}</p>
          )}

          {monograph && SECTIONS.map(({ key, label }) =>
            monograph[key] ? (
              <div key={key}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {label}
                </h3>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                  {monograph[key]}
                </p>
              </div>
            ) : null,
          )}

          {monograph && !SECTIONS.some(({ key }) => monograph[key]) && (
            <p className="py-4 text-center text-sm text-slate-400">
              No detailed sections available for this drug.
            </p>
          )}
        </div>
      )}

      {drug.bookshelfId && (
        <a
          href={`https://www.ncbi.nlm.nih.gov/books/${drug.bookshelfId}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          View full monograph &rarr;
        </a>
      )}
    </article>
  );
}

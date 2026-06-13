import { useState } from 'react';
import { getRecentSearches, clearRecentSearches } from '../lib/recentSearches';

const POPULAR_DRUGS = [
  'Ibuprofen',
  'Acetaminophen',
  'Sertraline',
  'Amoxicillin',
  'Fluoxetine',
  'Metformin',
  'Omeprazole',
  'Cetirizine',
];

export default function HomePage({ onDrugSelect }) {
  const [recent, setRecent] = useState(getRecentSearches);

  function clearRecent() {
    clearRecentSearches();
    setRecent([]);
  }

  return (
    <div className="py-8">
      <div className="text-center">
        <h1 className="text-xl font-bold tracking-tight text-sky-900 dark:text-slate-100">
          Evidence-based medication guidance for breastfeeding
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Search any drug or brand name for evidence-based information from the NIH LactMed database.
        </p>
      </div>

      {recent.length > 0 && (
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-center gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Recent searches
            </h2>
            <button
              onClick={clearRecent}
              className="text-xs font-medium text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {recent.map((name) => (
              <button
                key={name}
                onClick={() => onDrugSelect(name)}
                className="min-h-11 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-teal-600 shadow-sm ring-1 ring-teal-200 active:bg-teal-50 dark:bg-slate-900 dark:text-teal-400 dark:shadow-none dark:ring-teal-800 dark:active:bg-slate-800"
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Common searches
        </h2>
        <div className="flex flex-wrap justify-center gap-2">
          {POPULAR_DRUGS.map((name) => (
            <button
              key={name}
              onClick={() => onDrugSelect(name)}
              className="min-h-11 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 active:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:shadow-none dark:ring-slate-700 dark:active:bg-slate-800"
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-bold tracking-tight text-sky-900 dark:text-slate-100">About Lactia</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          Lactia helps parents and healthcare providers find trustworthy medicines information for breastfeeding mothers. Data comes from{' '}
          <a
            href="https://www.ncbi.nlm.nih.gov/books/NBK501922/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-600 underline hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300"
          >
            LactMed
          </a>
          , a peer-reviewed database maintained by the National Library of Medicine, containing information on over 1,800 drugs and substances.
        </p>
      </div>
    </div>
  );
}

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
  return (
    <div className="py-8">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 dark:bg-sky-900/30">
          <svg className="h-7 w-7 text-sky-600 dark:text-sky-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-sky-900 dark:text-sky-100">
          Medication safety during breastfeeding
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Search any drug or brand name for evidence-based lactation safety information from the NIH LactMed database.
        </p>
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          Common searches
        </h2>
        <div className="flex flex-wrap justify-center gap-2">
          {POPULAR_DRUGS.map((name) => (
            <button
              key={name}
              onClick={() => onDrugSelect(name)}
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm ring-1 ring-zinc-200 active:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:shadow-none dark:ring-zinc-700 dark:active:bg-zinc-800"
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-sky-900 dark:text-sky-100">About LactCheck</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          LactCheck helps parents and healthcare providers quickly look up medication safety information for breastfeeding. Data comes from{' '}
          <a
            href="https://www.ncbi.nlm.nih.gov/books/NBK501922/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-600 underline hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-300"
          >
            LactMed
          </a>
          , a peer-reviewed database maintained by the National Library of Medicine, containing information on over 1,800 drugs and substances.
        </p>
      </div>
    </div>
  );
}

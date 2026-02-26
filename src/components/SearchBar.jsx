import ThemeToggle from './ThemeToggle';

export default function SearchBar({ query, onChange, onHomeClick }) {
  return (
    <div className="sticky top-0 z-10 bg-white px-4 pt-6 pb-4 shadow-sm dark:bg-zinc-900 dark:shadow-none">
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-2xl font-bold text-sky-900 mb-1 cursor-pointer w-fit dark:text-sky-100"
            onClick={onHomeClick}
          >
            LactCheck
          </h1>
          <p className="text-sm text-zinc-500 mb-3 dark:text-zinc-400">
            Drug safety info for breastfeeding
          </p>
        </div>
        <ThemeToggle />
      </div>
      <input
        type="search"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by drug or brand name..."
        autoFocus
        className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-3 text-base
                   placeholder:text-zinc-400 focus:border-sky-600 focus:outline-none focus:ring-2
                   focus:ring-sky-200 transition-colors dark:border-zinc-700 dark:bg-zinc-800
                   dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:ring-sky-800"
      />
    </div>
  );
}

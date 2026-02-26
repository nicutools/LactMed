export default function SearchBar({ query, onChange, onHomeClick }) {
  return (
    <div className="sticky top-0 z-10 bg-white px-4 pt-6 pb-4 shadow-sm">
      <h1
        className="text-2xl font-bold text-sky-900 mb-1 cursor-pointer w-fit"
        onClick={onHomeClick}
      >
        LactCheck
      </h1>
      <p className="text-sm text-zinc-500 mb-3">
        Drug safety info for breastfeeding
      </p>
      <input
        type="search"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by drug or brand name..."
        autoFocus
        className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-3 text-base
                   placeholder:text-zinc-400 focus:border-sky-600 focus:outline-none focus:ring-2
                   focus:ring-sky-200 transition-colors"
      />
    </div>
  );
}

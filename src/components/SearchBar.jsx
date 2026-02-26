export default function SearchBar({ query, onChange, onHomeClick }) {
  return (
    <div className="sticky top-0 z-10 bg-white px-4 pt-6 pb-4 shadow-sm">
      <h1
        className="text-2xl font-bold text-slate-800 mb-1 cursor-pointer w-fit"
        onClick={onHomeClick}
      >
        LactCheck
      </h1>
      <p className="text-sm text-slate-500 mb-3">
        Drug safety info for breastfeeding
      </p>
      <input
        type="search"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by drug or brand name..."
        autoFocus
        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-base
                   placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2
                   focus:ring-blue-200 transition-colors"
      />
    </div>
  );
}

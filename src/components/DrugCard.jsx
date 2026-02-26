export default function DrugCard({ drug }) {
  const updated = drug.lastUpdated
    ? new Date(drug.lastUpdated).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

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

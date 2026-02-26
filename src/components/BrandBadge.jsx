export default function BrandBadge({ original, generic, type }) {
  if (!original) return null;

  const label =
    type === 'brand'
      ? 'is a brand name for'
      : 'is also known as';

  return (
    <div className="mb-3 rounded-xl bg-sky-100 border border-sky-200 px-4 py-3 text-sm text-sky-900">
      <span className="font-semibold">{original}</span> {label}{' '}
      <span className="font-semibold">{generic}</span>
    </div>
  );
}

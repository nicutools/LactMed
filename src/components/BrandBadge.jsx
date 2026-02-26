export default function BrandBadge({ originalBrand, generic }) {
  if (!originalBrand) return null;

  return (
    <div className="mb-3 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
      <span className="font-semibold">{originalBrand}</span> is a brand name for{' '}
      <span className="font-semibold">{generic}</span>
    </div>
  );
}

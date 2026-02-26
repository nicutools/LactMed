import data from '../data/brandToGeneric.json';

const mappings = data.mappings;

export function resolveBrand(query) {
  const key = query.trim().toLowerCase();
  const generic = mappings[key];

  if (generic) {
    return { resolved: true, generic, originalBrand: query.trim() };
  }

  return { resolved: false, generic: query.trim(), originalBrand: null };
}

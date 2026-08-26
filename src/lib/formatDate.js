// Date parsing and formatting for source-asserted dates (NIH LactMed revision
// dates). These are shown to clinicians as a currency claim, so they must be
// exact or absent — never approximate, never invented.
//
// The subtlety: `new Date('2026-04-15')` is parsed by JavaScript as UTC
// midnight, but `toLocaleDateString` renders in the viewer's local zone. West
// of UTC that lands on the previous day, so a monograph revised 15 April
// displayed as 14 April for every user in the Americas. Constructing from
// explicit parts forces a local-midnight parse and removes the shift.

/**
 * Parses an ISO `YYYY-MM-DD` string to a local-midnight Date.
 * Returns null for anything that is not a real calendar date, so a malformed
 * upstream value renders as nothing rather than as "Invalid Date".
 */
export function parseIsoDate(iso) {
  if (typeof iso !== 'string') return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(year, month - 1, day);

  // Reject values that don't round-trip: 2026-02-31, 2026-13-01, 2012-34-56.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

const DAY_FORMAT = { year: 'numeric', month: 'short', day: 'numeric' };

/** Formats an ISO date as e.g. "Apr 15, 2026". Null in, null out. */
export function formatIsoDate(iso, options = DAY_FORMAT) {
  const date = parseIsoDate(iso);
  return date ? date.toLocaleDateString('en-US', options) : null;
}

import { describe, it, expect } from 'vitest';
import { parseIsoDate, formatIsoDate } from '../src/lib/formatDate.js';
import { toIsoDate } from '../functions/api/search.js';

describe('formatIsoDate', () => {
  it('formats a valid ISO date', () => {
    expect(formatIsoDate('2026-04-15')).toBe('Apr 15, 2026');
  });

  it('does not shift the day for viewers west of UTC', () => {
    // Regression: `new Date('2026-04-15')` parses as UTC midnight, so
    // toLocaleDateString rendered 14 April for every user in the Americas.
    const parsed = parseIsoDate('2026-04-15');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(3);
    expect(parsed.getDate()).toBe(15);
    expect(parsed.getHours()).toBe(0);
  });

  it('returns null rather than "Invalid Date" for malformed input', () => {
    expect(formatIsoDate('2012-34-56')).toBeNull();
    expect(formatIsoDate('2026-02-31')).toBeNull();
    expect(formatIsoDate('2026-Apr-15')).toBeNull();
    expect(formatIsoDate('')).toBeNull();
    expect(formatIsoDate(null)).toBeNull();
    expect(formatIsoDate(undefined)).toBeNull();
  });

  it('accepts a real leap day and rejects a fake one', () => {
    expect(formatIsoDate('2024-02-29')).toBe('Feb 29, 2024');
    expect(formatIsoDate('2026-02-29')).toBeNull();
  });
});

describe('toIsoDate (PubMed ContributionDate)', () => {
  it('handles numeric months', () => {
    expect(toIsoDate('2026', '4', '15')).toBe('2026-04-15');
    expect(toIsoDate('2026', '04', '15')).toBe('2026-04-15');
  });

  it('handles month names, which PubMed sometimes emits', () => {
    // Regression: "Apr".padStart(2, '0') produced "2026-Apr-15".
    expect(toIsoDate('2026', 'Apr', '15')).toBe('2026-04-15');
    expect(toIsoDate('2026', 'April', '5')).toBe('2026-04-05');
  });

  it('returns null for anything that is not a real date', () => {
    expect(toIsoDate('2026', '13', '1')).toBeNull();
    expect(toIsoDate('2026', '2', '31')).toBeNull();
    expect(toIsoDate('2026', 'Foo', '15')).toBeNull();
    expect(toIsoDate('2026', null, '15')).toBeNull();
    expect(toIsoDate(null, '4', '15')).toBeNull();
  });
});

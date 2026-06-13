import { describe, it, expect } from 'vitest';
import { postProcess } from '../functions/api/monograph.js';

describe('postProcess', () => {
  it('decodes numeric and named HTML entities', () => {
    expect(postProcess('5&#x2009;mg &amp; 10&#8201;mg &lt;1%')).toBe(
      '5 mg & 10 mg <1%',
    );
    expect(postProcess('&quot;safe&quot; isn&apos;t')).toBe('"safe" isn\'t');
  });

  it('puts known sub-headings on their own lines', () => {
    const out = postProcess(
      'Maternal Levels. Ten women received a dose. Infant Levels. None measured.',
    );
    expect(out).toBe(
      'Maternal Levels.\nTen women received a dose.\n\nInfant Levels.\nNone measured.',
    );
  });

  it('collapses runs of blank lines', () => {
    expect(postProcess('a\n\n\n\nb')).toBe('a\n\nb');
  });

  it('trims surrounding whitespace', () => {
    expect(postProcess('  text  ')).toBe('text');
  });
});

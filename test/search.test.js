import { describe, it, expect } from 'vitest';
import { sanitizeQuery, parseArticles } from '../functions/api/search.js';

describe('sanitizeQuery', () => {
  it('passes plain drug names through', () => {
    expect(sanitizeQuery('ibuprofen')).toBe('ibuprofen');
    expect(sanitizeQuery('St. John\'s Wort')).toBe("St. John's Wort");
    expect(sanitizeQuery('co-trimoxazole')).toBe('co-trimoxazole');
  });

  it('strips NCBI term syntax characters', () => {
    expect(sanitizeQuery('ibuprofen[title]')).toBe('ibuprofen title');
    expect(sanitizeQuery('"sertraline"')).toBe('sertraline');
    expect(sanitizeQuery('a/b (c) {d} <e>')).toBe('a b c d e');
  });

  it('collapses whitespace and trims', () => {
    expect(sanitizeQuery('  ibu   profen  ')).toBe('ibu profen');
  });

  it('returns empty string when nothing searchable remains', () => {
    expect(sanitizeQuery('***')).toBe('');
    expect(sanitizeQuery('  []  ')).toBe('');
  });
});

const FIXTURE = `<?xml version="1.0" ?>
<PubmedArticleSet>
  <PubmedBookArticle>
    <BookDocument>
      <PMID Version="1">30000254</PMID>
      <ArticleIdList>
        <ArticleId IdType="bookaccession">NBK547845</ArticleId>
      </ArticleIdList>
      <ArticleTitle>Ibuprofen</ArticleTitle>
      <Abstract>
        <AbstractText>Because of its extremely low levels in breastmilk, short half-life and safe use in infants, ibuprofen is a preferred choice.</AbstractText>
      </Abstract>
      <ContributionDate>
        <Year>2024</Year>
        <Month>8</Month>
        <Day>15</Day>
      </ContributionDate>
    </BookDocument>
  </PubmedBookArticle>
  <PubmedBookArticle>
    <BookDocument>
      <PMID Version="1">30000123</PMID>
      <ArticleIdList>
        <ArticleId IdType="bookaccession">NBK500986</ArticleId>
      </ArticleIdList>
      <ArticleTitle>Acetaminophen</ArticleTitle>
      <ContributionDate>
        <Year>2023</Year>
        <Month>11</Month>
        <Day>2</Day>
      </ContributionDate>
    </BookDocument>
  </PubmedBookArticle>
</PubmedArticleSet>`;

describe('parseArticles', () => {
  const results = parseArticles(FIXTURE);

  it('extracts one record per PubmedBookArticle', () => {
    expect(results).toHaveLength(2);
  });

  it('extracts title, summary, and bookshelf id', () => {
    expect(results[0]).toMatchObject({
      title: 'Ibuprofen',
      bookshelfId: 'NBK547845',
    });
    expect(results[0].summary).toContain('preferred choice');
  });

  it('formats ContributionDate as ISO with zero padding', () => {
    expect(results[0].lastUpdated).toBe('2024-08-15');
    expect(results[1].lastUpdated).toBe('2023-11-02');
  });

  it('tolerates a missing abstract', () => {
    expect(results[1].summary).toBe('');
  });

  it('returns an empty array for non-matching XML', () => {
    expect(parseArticles('<PubmedArticleSet></PubmedArticleSet>')).toEqual([]);
  });
});

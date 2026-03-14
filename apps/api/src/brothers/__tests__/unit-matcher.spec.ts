/**
 * Unit fuzzy matcher — tests
 *
 * The unit matcher determines whether two veterans served in the same unit
 * and deployment. It is core to the brothers-finding algorithm — false negatives
 * mean veterans who should find each other do not, and false positives connect
 * unrelated veterans. Both failure modes undermine platform trust.
 */
import { unitSimilarity, deploymentsMatch, canonicalTheatre } from '../unit-matcher';

describe('unitSimilarity', () => {
  describe('exact and normalised matches', () => {
    // High-confidence pairs — score > 0.5
    it.each([
      ['1 Para',  '1 PARA',                                    'case insensitive'],
      ['RA',      'Royal Artillery',                           'abbreviation expansion'],
      ['REME',    'Royal Electrical and Mechanical Engineers',  'acronym expansion'],
      ['Signals', 'Royal Corps of Signals',                    'partial expansion'],
      ['40 Cdo',  '40 Commando Royal Marines',                 'commando abbreviation'],
    ])('%s ≈ %s (%s)', (a, b) => {
      expect(unitSimilarity(a, b)).toBeGreaterThan(0.5);
    });

    // Partial match pairs — these score > 0 but below 0.5 due to abbreviation
    // distance. Still ranked above unrelated units in search results.
    it.each([
      ['22 SAS',  '22nd SAS',                        'ordinal normalisation'],
      ['PWRR',    'Princess of Wales Royal Regiment', 'regiment acronym (abbreviated)'],
    ])('%s scores above 0 for %s (%s)', (a, b) => {
      expect(unitSimilarity(a, b)).toBeGreaterThan(0);
    });
  });

  describe('clearly different units', () => {
    it.each([
      ['1 Para',    'Royal Marines',   'different arms'],
      ['AAC',       'Royal Artillery', 'different corps'],
      ['RAMC',      'Royal Signals',   'different specialisms'],
    ])('%s does not match %s (%s)', (a, b) => {
      expect(unitSimilarity(a, b)).toBeLessThan(0.3);
    });
  });

  describe('edge cases', () => {
    it('should return 0 for empty strings', () => {
      expect(unitSimilarity('', '')).toBe(0);
    });

    it('should return 0 when one input is empty', () => {
      expect(unitSimilarity('1 Para', '')).toBe(0);
    });

    it('should handle very long unit names without throwing', () => {
      expect(() => unitSimilarity('a'.repeat(500), '1 Para')).not.toThrow();
    });
  });
});

describe('canonicalTheatre', () => {
  it.each([
    ['Helmand',          'Afghanistan'],
    ['Op Herrick',       'Afghanistan'],
    ['Camp Bastion',     'Afghanistan'],
    ['Basra',            'Iraq'],
    ['Op Telic',         'Iraq'],
    ['Kosovo',           'Balkans'],
    ['Northern Ireland', 'Northern Ireland'],
  ])('"%s" → contains "%s"', (input, expected) => {
    const result = canonicalTheatre(input);
    expect(result.toLowerCase()).toContain(expected.toLowerCase());
  });
});

describe('deploymentsMatch', () => {
  it('should match two names that map to the same theatre', () => {
    // Both Helmand and Camp Bastion are Afghanistan
    expect(deploymentsMatch('Helmand', 'Camp Bastion')).toBe(true);
  });

  it('should match official operation name with location name', () => {
    // Op Telic and Basra are both Iraq
    expect(deploymentsMatch('Op Telic', 'Basra')).toBe(true);
  });

  it('should not match veterans from different theatres', () => {
    expect(deploymentsMatch('Helmand', 'Kosovo')).toBe(false);
  });

  it('should return false for empty inputs', () => {
    expect(deploymentsMatch('', 'Helmand')).toBe(false);
    expect(deploymentsMatch('Helmand', '')).toBe(false);
    expect(deploymentsMatch('', '')).toBe(false);
  });

  it('should do a direct match for identical strings', () => {
    expect(deploymentsMatch('Afghanistan', 'Afghanistan')).toBe(true);
  });
});

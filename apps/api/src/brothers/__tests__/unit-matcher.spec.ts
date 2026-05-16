import { canonicalTheatre, deploymentsMatch, unitSimilarity } from '../unit-matcher';

describe('unitSimilarity', () => {
  describe('exact and normalized matches', () => {
    it.each([
      ['1 Para', '1 PARA', 'case insensitive'],
      ['RA', 'Royal Artillery', 'abbreviation expansion'],
      ['REME', 'Royal Electrical and Mechanical Engineers', 'acronym expansion'],
      ['Signals', 'Royal Corps of Signals', 'normalized alias expansion'],
      ['40 Cdo', '40 Commando Royal Marines', 'commando abbreviation'],
    ])('%s strongly matches %s (%s)', (left, right) => {
      expect(unitSimilarity(left, right)).toBeGreaterThanOrEqual(0.85);
    });

    it('recognizes battalion wording as the same regiment label', () => {
      expect(unitSimilarity('1st Battalion Parachute Regiment', '1 Para')).toBeGreaterThanOrEqual(0.7);
    });
  });

  describe('clearly different units', () => {
    it.each([
      ['1 Para', 'Royal Marines'],
      ['AAC', 'Royal Artillery'],
      ['RAMC', 'Royal Signals'],
    ])('%s does not closely match %s', (left, right) => {
      expect(unitSimilarity(left, right)).toBeLessThan(0.35);
    });
  });

  describe('edge cases', () => {
    it('returns 0 for empty strings', () => {
      expect(unitSimilarity('', '')).toBe(0);
    });

    it('returns 0 when one input is empty', () => {
      expect(unitSimilarity('1 Para', '')).toBe(0);
    });

    it('handles very long unit names without throwing', () => {
      expect(() => unitSimilarity('a'.repeat(500), '1 Para')).not.toThrow();
    });
  });
});

describe('canonicalTheatre', () => {
  it.each([
    ['Helmand', 'Afghanistan'],
    ['Op Herrick', 'Afghanistan'],
    ['Camp Bastion', 'Afghanistan'],
    ['Basra', 'Iraq'],
    ['Op Telic', 'Iraq'],
    ['Kosovo', 'Balkans'],
    ['Northern Ireland', 'Northern Ireland'],
  ])('maps %s to %s', (input, expected) => {
    expect(canonicalTheatre(input).toLowerCase()).toContain(expected.toLowerCase());
  });
});

describe('deploymentsMatch', () => {
  it('matches two names that map to the same theatre', () => {
    expect(deploymentsMatch('Helmand', 'Camp Bastion')).toBe(true);
  });

  it('matches official operation names with location names', () => {
    expect(deploymentsMatch('Op Telic', 'Basra')).toBe(true);
  });

  it('matches normalized punctuation variants', () => {
    expect(deploymentsMatch('Operation-Herrick', 'op herrick')).toBe(true);
  });

  it('does not match veterans from different theatres', () => {
    expect(deploymentsMatch('Helmand', 'Kosovo')).toBe(false);
  });

  it('returns false for empty inputs', () => {
    expect(deploymentsMatch('', 'Helmand')).toBe(false);
    expect(deploymentsMatch('Helmand', '')).toBe(false);
    expect(deploymentsMatch('', '')).toBe(false);
  });

  it('matches identical direct strings', () => {
    expect(deploymentsMatch('Afghanistan', 'Afghanistan')).toBe(true);
  });
});

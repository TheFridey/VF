/**
 * VeteranFinder unit and deployment matching helpers.
 *
 * These normalize the messy ways veterans describe units, theatres, and
 * operations so brothers-search scoring can prefer strong shared-service
 * signals without overmatching unrelated records.
 */

const ORDINAL_MAP: Record<string, string> = {
  '1st': '1',
  '2nd': '2',
  '3rd': '3',
  '4th': '4',
  '5th': '5',
  '6th': '6',
  '7th': '7',
  '8th': '8',
  '9th': '9',
  '10th': '10',
  first: '1',
  second: '2',
  third: '3',
  fourth: '4',
};

const UNIT_EXPANSIONS: Record<string, string[]> = {
  para: ['parachute', 'parachute regiment'],
  rlc: ['royal logistic corps', 'royal logistics corps'],
  reme: ['royal electrical mechanical engineers', 'royal electrical and mechanical engineers'],
  rac: ['royal armoured corps'],
  ra: ['royal artillery'],
  re: ['royal engineers'],
  ric: ['royal irish constabulary'],
  rgr: ['royal gurkha rifles'],
  rifles: ['the rifles'],
  pwrr: ['princess of wales royal regiment'],
  mercian: ['mercian regiment'],
  yorks: ['yorkshire regiment'],
  lancs: ['lancashire fusiliers', 'duke of lancasters regiment'],
  scots: ['royal regiment of scotland', 'scots guards'],
  welsh: ['royal welsh', 'welsh guards'],
  irish: ['royal irish regiment'],
  sas: ['special air service', '22 special air service', '21 special air service', '23 special air service'],
  sfsg: ['special forces support group'],
  jtf2: ['joint task force 2'],
  commando: ['royal marines commando', 'commando'],
  '3 cdo': ['3 commando brigade', '3rd commando brigade'],
  '40 cdo': ['40 commando', '40 commando royal marines'],
  '42 cdo': ['42 commando', '42 commando royal marines'],
  '45 cdo': ['45 commando', '45 commando royal marines'],
  signals: ['royal corps of signals', 'royal signals'],
  'int corps': ['intelligence corps'],
  aac: ['army air corps'],
  agc: ['adjutant general corps', 'provost'],
  ramc: ['royal army medical corps'],
  radc: ['royal army dental corps'],
  qaranc: ['queens alexandra royal army nursing corps'],
};

const DEPLOYMENT_THEATRES: Record<string, string[]> = {
  afghanistan: [
    'helmand',
    'kandahar',
    'kabul',
    'op herrick',
    'operation herrick',
    'herrick',
    'sangin',
    'lashkar gah',
    'camp bastion',
    'fob price',
    'nad e ali',
    'garmsir',
    'now zad',
  ],
  iraq: [
    'basra',
    'baghdad',
    'op telic',
    'operation telic',
    'telic',
    'al amarah',
    'umm qasr',
    'camp abu naji',
  ],
  'northern ireland': [
    'ni',
    'belfast',
    'londonderry',
    'derry',
    'op banner',
    'operation banner',
    'banner',
    'crossmaglen',
    'south armagh',
  ],
  balkans: [
    'bosnia',
    'kosovo',
    'sarajevo',
    'pristina',
    'op palatine',
    'op agricola',
    'ifor',
    'sfor',
    'kfor',
  ],
  falklands: ['falkland islands', 'op corporate', 'mount longdon', 'goose green'],
  'sierra leone': ['op palliser', 'freetown'],
  cyprus: ['dhekelia', 'episkopi', 'akrotiri', 'bfcy'],
  germany: ['bfg', 'british forces germany', 'sennelager', 'rheindahlen', 'paderborn'],
  brunei: ['seria', 'tuker lines'],
};

function normaliseText(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function replaceOrdinals(raw: string): string {
  let value = raw;

  for (const [ordinal, number] of Object.entries(ORDINAL_MAP)) {
    value = value.replace(new RegExp(`\\b${ordinal}\\b`, 'g'), number);
  }

  return value;
}

function normaliseUnit(raw: string): string {
  if (!raw) {
    return '';
  }

  const withOrdinals = replaceOrdinals(normaliseText(raw));

  return withOrdinals
    .replace(/\b(the|of|and|bn|battalion|regiment|regt|sqn|squadron|coy|company|platoon|troop)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normaliseDeployment(raw: string): string {
  if (!raw) {
    return '';
  }

  return replaceOrdinals(normaliseText(raw));
}

const THEATRE_LOOKUP = new Map<string, string>();

for (const [canonical, aliases] of Object.entries(DEPLOYMENT_THEATRES)) {
  THEATRE_LOOKUP.set(normaliseDeployment(canonical), canonical);

  for (const alias of aliases) {
    THEATRE_LOOKUP.set(normaliseDeployment(alias), canonical);
  }
}

const UNIT_ALIAS_LOOKUP = new Map<string, string>();

for (const [abbreviation, expansions] of Object.entries(UNIT_EXPANSIONS)) {
  const canonicalAbbreviation = normaliseUnit(abbreviation);

  UNIT_ALIAS_LOOKUP.set(canonicalAbbreviation, canonicalAbbreviation);

  for (const expansion of expansions) {
    UNIT_ALIAS_LOOKUP.set(normaliseUnit(expansion), canonicalAbbreviation);
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function canonicaliseUnit(value: string): string {
  let canonical = value;

  for (const [alias, abbreviation] of UNIT_ALIAS_LOOKUP.entries()) {
    if (alias === abbreviation) {
      continue;
    }

    canonical = canonical.replace(new RegExp(`\\b${escapeRegExp(alias)}\\b`, 'g'), abbreviation);
  }

  return canonical.replace(/\s+/g, ' ').trim();
}

function tokenSet(value: string): Set<string> {
  return new Set(value.split(' ').filter(Boolean));
}

function jaccardSimilarity(a: string, b: string): number {
  if (!a || !b) {
    return 0;
  }

  const setA = tokenSet(a);
  const setB = tokenSet(b);
  const intersection = [...setA].filter((token) => setB.has(token)).length;
  const union = new Set([...setA, ...setB]).size;

  return union === 0 ? 0 : intersection / union;
}

function levenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, (_, rowIndex) =>
    Array.from({ length: b.length + 1 }, (_, columnIndex) =>
      rowIndex === 0 ? columnIndex : columnIndex === 0 ? rowIndex : 0
    ),
  );

  for (let row = 1; row <= a.length; row += 1) {
    for (let column = 1; column <= b.length; column += 1) {
      matrix[row][column] = a[row - 1] === b[column - 1]
        ? matrix[row - 1][column - 1]
        : 1 + Math.min(
          matrix[row - 1][column],
          matrix[row][column - 1],
          matrix[row - 1][column - 1],
        );
    }
  }

  return matrix[a.length][b.length];
}

function normalisedEditSimilarity(a: string, b: string): number {
  const distance = levenshtein(a, b);
  const maxLength = Math.max(a.length, b.length);

  return maxLength === 0 ? 1 : 1 - distance / maxLength;
}

function resolveUnitAlias(value: string): string {
  return UNIT_ALIAS_LOOKUP.get(value) ?? value;
}

function canonicaliseDeployment(raw: string): string {
  const value = normaliseDeployment(raw);

  return THEATRE_LOOKUP.get(value) ?? value;
}

/**
 * Returns a score from 0 to 1 representing how likely two unit labels refer to
 * the same unit. >= 0.7 is a likely match, >= 0.85 is a strong match.
 */
export function unitSimilarity(a: string, b: string): number {
  if (!a || !b) {
    return 0;
  }

  const normalisedA = normaliseUnit(a);
  const normalisedB = normaliseUnit(b);

  if (!normalisedA || !normalisedB) {
    return 0;
  }

  if (normalisedA === normalisedB) {
    return 1;
  }

  const canonicalA = canonicaliseUnit(resolveUnitAlias(normalisedA));
  const canonicalB = canonicaliseUnit(resolveUnitAlias(normalisedB));

  if (canonicalA === canonicalB) {
    return 1;
  }

  const jaccard = jaccardSimilarity(canonicalA, canonicalB);
  const edit = normalisedEditSimilarity(canonicalA, canonicalB);
  const containment = canonicalA.includes(canonicalB) || canonicalB.includes(canonicalA) ? 0.25 : 0;

  return Math.min(1, jaccard * 0.55 + edit * 0.25 + containment);
}

/**
 * Returns true when two deployment labels point to the same theatre.
 */
export function deploymentsMatch(a: string, b: string): boolean {
  if (!a || !b) {
    return false;
  }

  const canonicalA = canonicaliseDeployment(a);
  const canonicalB = canonicaliseDeployment(b);

  if (canonicalA === canonicalB) {
    return true;
  }

  return unitSimilarity(a, b) >= 0.7;
}

/**
 * Returns the canonical theatre label for display.
 */
export function canonicalTheatre(raw: string): string {
  const canonical = canonicaliseDeployment(raw);

  return canonical.replace(/\b\w/g, (character) => character.toUpperCase());
}

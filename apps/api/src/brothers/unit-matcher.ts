/**
 * VeteranFinder — Unit name fuzzy matching
 *
 * Handles the real-world messiness of how veterans describe their units:
 *   "1 Para" === "1st Battalion Parachute Regiment" === "1 PARA"
 *   "22 SAS" === "22nd SAS" === "22 Special Air Service"
 *   "Helmand" === "Afghanistan" (via deployment theatre mapping)
 */

// ─── Normalisation ────────────────────────────────────────────────────────────

const ORDINAL_MAP: Record<string, string> = {
  '1st': '1', '2nd': '2', '3rd': '3', '4th': '4', '5th': '5',
  '6th': '6', '7th': '7', '8th': '8', '9th': '9', '10th': '10',
  'first': '1', 'second': '2', 'third': '3', 'fourth': '4',
};

const UNIT_EXPANSIONS: Record<string, string[]> = {
  'para':       ['parachute', 'parachute regiment'],
  'rlc':        ['royal logistic corps', 'royal logistics corps'],
  'reme':       ['royal electrical mechanical engineers', 'royal electrical and mechanical engineers'],
  'rac':        ['royal armoured corps'],
  'ra':         ['royal artillery'],
  're':         ['royal engineers'],
  'ric':        ['royal irish constabulary'],
  'rgr':        ['royal gurkha rifles'],
  'rifles':     ['the rifles'],
  'pwrr':       ['princess of wales royal regiment'],
  'mercian':    ['mercian regiment'],
  'yorks':      ['yorkshire regiment'],
  'lancs':      ['lancashire fusiliers', 'duke of lancasters regiment'],
  'scots':      ['royal regiment of scotland', 'scots guards'],
  'welsh':      ['royal welsh', 'welsh guards'],
  'irish':      ['royal irish regiment'],
  'sas':        ['special air service', '22 special air service', '21 special air service', '23 special air service'],
  'sfsg':       ['special forces support group'],
  'jtf2':       ['joint task force 2'],
  'commando':   ['royal marines commando', 'commando'],
  '3 cdo':      ['3 commando brigade', '3rd commando brigade'],
  '40 cdo':     ['40 commando', '40 commando royal marines'],
  '42 cdo':     ['42 commando', '42 commando royal marines'],
  '45 cdo':     ['45 commando', '45 commando royal marines'],
  'signals':    ['royal corps of signals', 'royal signals'],
  'int corps':  ['intelligence corps'],
  'aac':        ['army air corps'],
  'agi':        ['adjutant general corps', 'provost'],
  'ramc':       ['royal army medical corps'],
  'radc':       ['royal army dental corps'],
  'qaranc':     ['queens alexandra royal army nursing corps'],
};

// Deployment theatre canonicalisation
const DEPLOYMENT_THEATRES: Record<string, string[]> = {
  'afghanistan': [
    'helmand', 'kandahar', 'kabul', 'op herrick', 'operation herrick',
    'herrick', 'sangin', 'lashkar gah', 'camp bastion', 'fob price',
    'nad-e ali', 'garmsir', 'now zad',
  ],
  'iraq': [
    'basra', 'baghdad', 'op telic', 'operation telic', 'telic',
    'al amarah', 'umm qasr', 'camp abu naji',
  ],
  'northern ireland': [
    'ni', 'belfast', 'londonderry', 'derry', 'op banner', 'operation banner',
    'banner', 'crossmaglen', 'south armagh',
  ],
  'balkans': [
    'bosnia', 'kosovo', 'sarajevo', 'pristina', 'op palatine', 'op agricola',
    'ifor', 'sfor', 'kfor',
  ],
  'falklands': ['falkland islands', 'op corporate', 'mount longdon', 'goose green'],
  'sierra leone': ['op palliser', 'freetown'],
  'cyprus': ['dhekelia', 'episkopi', 'akrotiri', 'bfcy'],
  'germany': ['bfg', 'british forces germany', 'sennelager', 'rheindahlen', 'paderborn'],
  'brunei': ['seria', 'tuker lines'],
};

// Build reverse lookup: alias -> canonical
const THEATRE_LOOKUP = new Map<string, string>();
for (const [canonical, aliases] of Object.entries(DEPLOYMENT_THEATRES)) {
  THEATRE_LOOKUP.set(canonical, canonical);
  for (const alias of aliases) {
    THEATRE_LOOKUP.set(alias.toLowerCase(), canonical);
  }
}

// Build unit alias lookup
const UNIT_ALIAS_LOOKUP = new Map<string, string>();
for (const [abbrev, expansions] of Object.entries(UNIT_EXPANSIONS)) {
  UNIT_ALIAS_LOOKUP.set(abbrev, abbrev);
  for (const exp of expansions) {
    UNIT_ALIAS_LOOKUP.set(exp.toLowerCase(), abbrev);
  }
}

function normaliseUnit(raw: string): string {
  if (!raw) return '';
  let s = raw.toLowerCase().trim();
  // Replace ordinals
  for (const [ord, num] of Object.entries(ORDINAL_MAP)) {
    s = s.replace(new RegExp(`\\b${ord}\\b`, 'g'), num);
  }
  // Remove common filler words
  s = s.replace(/\b(the|of|and|&|bn|battalion|regiment|regt|sqn|squadron|coy|company|platoon|troop)\b/g, ' ');
  s = s.replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  return s;
}

function canonicaliseDeployment(raw: string): string {
  const lower = raw.toLowerCase().trim();
  return THEATRE_LOOKUP.get(lower) ?? lower;
}

// ─── Similarity ───────────────────────────────────────────────────────────────

function tokenSet(s: string): Set<string> {
  return new Set(s.split(' ').filter(Boolean));
}

function jaccardSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const setA = tokenSet(a);
  const setB = tokenSet(b);
  const intersection = [...setA].filter(t => setB.has(t)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function normalisedEditSimilarity(a: string, b: string): number {
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1 : 1 - dist / maxLen;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns a score 0-1 representing how likely two unit names refer to the same unit.
 * Threshold: >= 0.6 = likely match, >= 0.8 = strong match
 */
export function unitSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;

  const na = normaliseUnit(a);
  const nb = normaliseUnit(b);

  if (na === nb) return 1.0;

  // Check if abbreviations resolve to same canonical
  const ca = UNIT_ALIAS_LOOKUP.get(na) ?? na;
  const cb = UNIT_ALIAS_LOOKUP.get(nb) ?? nb;
  if (ca === cb) return 1.0;

  // Token jaccard similarity
  const jaccard = jaccardSimilarity(na, nb);
  // Character-level edit distance
  const edit = normalisedEditSimilarity(na, nb);
  // Substring containment bonus
  const containment = (na.includes(nb) || nb.includes(na)) ? 0.3 : 0;

  return Math.min(1.0, jaccard * 0.5 + edit * 0.3 + containment);
}

/**
 * Returns true if two deployment strings likely refer to the same theatre.
 */
export function deploymentsMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  const ca = canonicaliseDeployment(a);
  const cb = canonicaliseDeployment(b);
  if (ca === cb) return true;
  // Fallback to substring / edit similarity
  return unitSimilarity(a, b) >= 0.6;
}

/**
 * Returns the canonical theatre name for display.
 */
export function canonicalTheatre(raw: string): string {
  const canonical = canonicaliseDeployment(raw);
  // Title case
  return canonical.replace(/\b\w/g, c => c.toUpperCase());
}

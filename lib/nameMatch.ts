// Name normalisation and fuzzy matching, extracted verbatim from the admin
// guest duplicate-check route so the guest-facing registry beneficiary picker
// can reuse exactly the same matching rules.
//
// Both callers work over the full household/guest list in process rather than
// with SQL ilike: the list is small (dozens of households) and in-process
// matching buys normalisation SQL can't do — punctuation and accent folding,
// "&" vs "and", "The X Family" stripping, and typo tolerance via edit distance.

// Lowercase, strip accents and punctuation, unify "&"/"and", collapse spaces.
export function normText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const HOUSEHOLD_STOPWORDS = new Set(['the', 'and', 'family', 'household', 'of']);

// Household names additionally drop framing words: "The Smith Family" → "smith".
export function normHousehold(s: string): string {
  return normText(s)
    .split(' ')
    .filter(t => !HOUSEHOLD_STOPWORDS.has(t))
    .join(' ');
}

export function significantTokens(normalised: string): string[] {
  return normalised.split(' ').filter(t => t.length >= 3);
}

// Mobile numbers compare on digits only, with AU "+61 4xx" folded onto "04xx".
export function normMobile(s: string): string {
  const digits = s.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('61')) return `0${digits.slice(2)}`;
  return digits;
}

// Classic Levenshtein — inputs here are short names, so O(a·b) is fine.
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const prev = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

// Typo tolerance scaled to length: short strings must match exactly.
export function isCloseMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  const maxLen = Math.max(a.length, b.length);
  const allowed = maxLen >= 12 ? 2 : maxLen >= 5 ? 1 : 0;
  return editDistance(a, b) <= allowed;
}

/**
 * Word-prefix match, for typeahead rather than duplicate detection.
 *
 * matchHouseholdName below compares whole names against whole names, which is
 * right when checking "is this the same household?" but wrong while someone is
 * still typing: it needs four characters before `includes` engages, so "Pap"
 * and "Smi" match nothing. This instead asks whether every word of the query
 * prefixes some word of the candidate — "pap" finds "Maria Papalia", and
 * "gab pap" finds "Imma, Gabby & Grace Papalia".
 */
export function matchesNamePrefix(candidateName: string, target: string): boolean {
  const candidateWords = normHousehold(candidateName).split(' ').filter(Boolean);
  const queryWords = target.split(' ').filter(Boolean);
  if (queryWords.length === 0 || candidateWords.length === 0) return false;
  return queryWords.every(q => candidateWords.some(w => w.startsWith(q)));
}

/**
 * Scores a candidate household name against a target. Returns null for no match.
 * Shared by the admin duplicate check (which surfaces both kinds as warnings)
 * and the registry beneficiary typeahead (which just needs a ranked shortlist).
 */
export function matchHouseholdName(candidateName: string, target: string, targetTokens: Set<string>): { exact: boolean } | null {
  const candidate = normHousehold(candidateName);
  if (!candidate || !target) return null;

  const exact = candidate === target;
  const similar =
    !exact &&
    (isCloseMatch(candidate, target) ||
      // One name contains the other ("smith" ⊂ "smith and jones").
      (target.length >= 4 && candidate.includes(target)) ||
      (candidate.length >= 4 && target.includes(candidate)) ||
      // Shared significant word — usually the surname.
      significantTokens(candidate).some(t => targetTokens.has(t)));

  if (!exact && !similar) return null;
  return { exact };
}

// Mirrors the backend PasswordSecurityService.isPatternWeak() exactly.
// Any change here must also be reflected in password-security.service.ts.

const WEAK_BASES = [
  'password', 'passw0rd', 'p@ssword', 'p@ssw0rd', 'qwerty',
  'letmein', 'welcome', 'admin', 'login', 'iloveyou', 'monkey',
  'dragon', 'master', 'sunshine', 'princess', 'football', 'baseball',
  'superman', 'batman', 'shadow', 'michael', 'jessica', 'charlie',
  'donald', 'thomas', 'hunter', 'ranger', 'killer', 'soccer',
  'liverpool', 'arsenal', 'chelsea', 'rangers', 'trustno1',
  'abc123', 'starwars', '123456', '12345678', '11111111',
  'veteran', 'military', 'soldier', 'army', 'navy', 'airforce',
];

const SEQUENTIAL_PATTERNS = [
  '01234','12345','23456','34567','45678','56789',
  '98765','87654','76543','65432',
  'abcde','bcdef','cdefg','defgh','efghi','fghij',
  'qwert','werty','ertyu','rtyui','tyuio',
  'asdfg','sdfgh','dfghj','fghjk',
  'zxcvb','xcvbn','cvbnm',
];

export function isCommonPassword(password: string): boolean {
  const lower = password.toLowerCase();
  // Strip special chars and digits to find the base word
  const stripped = lower.replace(/[^a-z0-9]/g, '');

  // Reject if built on a known weak base word
  for (const base of WEAK_BASES) {
    if (stripped.includes(base)) return true;
    if (lower.includes(base)) return true;
  }

  // Reject sequential runs (12345, abcde, qwerty...)
  for (const seq of SEQUENTIAL_PATTERNS) {
    if (stripped.includes(seq)) return true;
  }

  // Reject repeated characters (aaaa1!, etc)
  if (/(.)\1{4,}/.test(lower)) return true;

  // Reject passwords that are only digits + special chars (1234567890! etc)
  if (/^[\d\W]+$/.test(password)) return true;

  return false;
}

// Pattern-based common password detection
// Catches Password123!, P@ssword1, Qwerty123! and infinite variations

const WEAK_BASES = [
  'password', 'passw0rd', 'p@ssword', 'p@ssw0rd',
  'qwerty', 'qwertyui', 'letmein', 'welcome',
  'admin', 'login', 'iloveyou', 'monkey',
  'dragon', 'master', 'sunshine', 'princess',
  'football', 'baseball', 'superman', 'batman',
  'shadow', 'michael', 'jessica', 'charlie',
  'donald', 'thomas', 'hunter', 'ranger',
  'killer', 'soccer', 'liverpool', 'arsenal',
  'chelsea', 'rangers', 'trustno1', 'abc123',
  'starwars', 'letmein', '123456', '12345678',
];

const SEQUENTIAL_PATTERNS = [
  '01234', '12345', '23456', '34567', '45678',
  '56789', '98765', '87654', '76543', '65432',
  'abcde', 'bcdef', 'cdefg', 'zyxwv',
  'qwert', 'werty', 'ertyu', 'rtyui',
  'asdfg', 'sdfgh', 'dfghj',
  'zxcvb', 'xcvbn', 'cvbnm',
];

export function isCommonPassword(password: string): boolean {
  const lower = password.toLowerCase();
  const stripped = lower.replace(/[^a-z0-9]/g, '');

  // Check against common base words
  for (const base of WEAK_BASES) {
    if (stripped.includes(base)) return true;
    if (lower.includes(base)) return true;
  }

  // Check for sequential runs
  for (const seq of SEQUENTIAL_PATTERNS) {
    if (stripped.includes(seq)) return true;
  }

  // Repeated characters (aaaa1!, etc)
  if (/(.)\1{4,}/.test(lower)) return true;

  // Keyboard row walks (5+ consecutive chars from same row)
  const keyboardRows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
  for (const row of keyboardRows) {
    for (let i = 0; i <= row.length - 5; i++) {
      if (stripped.includes(row.slice(i, i + 5))) return true;
    }
  }

  return false;
}

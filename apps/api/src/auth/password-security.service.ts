import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import * as https from 'https';
import { PrismaService } from '../common/prisma/prisma.service';

// ─── Argon2id Parameters ──────────────────────────────────────────────────────
// Argon2id — NIST SP 800-63B + OWASP ASVS Level 3 compliant
// Type:        Argon2id  (resists side-channel AND GPU/ASIC attacks simultaneously)
// Memory:      64 MB     (makes parallel GPU attacks prohibitively expensive)
// Iterations:  3         (time cost — slows brute force without impacting UX)
// Parallelism: 1 thread  (see note below)
// Hash length: 32 bytes  (256-bit output)
//
// ── Why parallelism=1, not 4 ────────────────────────────────────────────────
// argon2 runs inside Node.js's libuv thread pool (default size: 4 threads).
// Setting parallelism=4 fills ALL 4 libuv threads for the duration of each
// hash (~300–600ms with these params).  While those threads are busy, ALL
// other libuv-dependent async operations queue behind them — including the
// initial TCP socket creation for new Prisma connections.  Under concurrent
// login attempts this manifests as P2024 connection-pool exhaustion.
//
// parallelism=1 uses one thread per hash operation, leaving the other 3 free
// for Prisma, DNS, file I/O, etc.  The security impact is negligible: the
// memory cost (64 MB) already makes GPU cracking prohibitively expensive
// regardless of the thread count used during hashing.
const ARGON2_MEMORY   = 65536;  // 64 MB
const ARGON2_TIME     = 3;
const ARGON2_PARALLEL = 1;      // ← was 4; see note above
const ARGON2_LENGTH   = 32;

// ─── Security Policy ──────────────────────────────────────────────────────────
const MAX_FAILED_ATTEMPTS   = 5;
const LOCKOUT_DURATION_MS   = 15 * 60 * 1000;  // 15 minutes
const RESET_WINDOW_MS       = 30 * 60 * 1000;  // Reset counter after 30 min quiet
const PASSWORD_HISTORY_DEPTH = 10;              // Prevent reuse of last 10 passwords
const MIN_ENTROPY_BITS       = 50;              // Minimum Shannon entropy

// ─── Common weak password patterns ───────────────────────────────────────────
const WEAK_BASES = [
  'password','passw0rd','p@ssword','p@ssw0rd','qwerty','qwertyui',
  'letmein','welcome','admin','login','iloveyou','monkey','dragon',
  'master','sunshine','princess','football','baseball','superman',
  'batman','shadow','michael','jessica','charlie','donald','thomas',
  'hunter','ranger','killer','soccer','liverpool','arsenal','chelsea',
  'rangers','trustno1','abc123','starwars','123456','12345678',
  '11111111','00000000','veteran','military','soldier','army','navy',
  'airforce','marines','british','england','london','scotland',
];

const SEQUENTIAL_PATTERNS = [
  '01234','12345','23456','34567','45678','56789','67890',
  '98765','87654','76543','65432','54321','43210',
  'abcde','bcdef','cdefg','defgh','efghi','fghij','ghijk',
  'zyxwv','yxwvu','xwvut',
  'qwert','werty','ertyu','rtyui','tyuio','yuiop',
  'asdfg','sdfgh','dfghj','fghjk','ghjkl',
  'zxcvb','xcvbn','cvbnm',
];

const KEYBOARD_ROWS = ['qwertyuiop','asdfghjkl','zxcvbnm'];

@Injectable()
export class PasswordSecurityService {
  private readonly logger = new Logger(PasswordSecurityService.name);
  private readonly pepper: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const pepper = this.configService.get<string>('PASSWORD_PEPPER');
    if (!pepper || pepper.length < 32) {
      this.logger.error('PASSWORD_PEPPER is missing or too short (<32 chars) — CRITICAL SECURITY RISK');
    }
    this.pepper = pepper || '';
  }

  // ─── Pepper Application ───────────────────────────────────────────────────
  // HMAC-SHA256 pepper applied before Argon2id.
  // A database breach alone yields nothing — the pepper is required to crack
  // any hash. The pepper lives in the environment/secrets manager, not the DB.

  private applyPepper(password: string): string {
    if (!this.pepper) return password;
    return crypto.createHmac('sha256', this.pepper).update(password).digest('hex');
  }

  // ─── Hashing ──────────────────────────────────────────────────────────────

  async hash(password: string): Promise<string> {
    return argon2.hash(this.applyPepper(password), {
      type: argon2.argon2id,
      memoryCost: ARGON2_MEMORY,
      timeCost: ARGON2_TIME,
      parallelism: ARGON2_PARALLEL,
      hashLength: ARGON2_LENGTH,
    });
  }

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, this.applyPepper(password));
    } catch {
      // Maintain consistent timing even on invalid hash format
      await argon2.hash(this.applyPepper('dummy-timing-protection'), {
        type: argon2.argon2id,
        memoryCost: ARGON2_MEMORY,
        timeCost: ARGON2_TIME,
        parallelism: ARGON2_PARALLEL,
        hashLength: ARGON2_LENGTH,
      });
      return false;
    }
  }

  needsRehash(hash: string): boolean {
    return argon2.needsRehash(hash, {
      type: argon2.argon2id,
      memoryCost: ARGON2_MEMORY,
      timeCost: ARGON2_TIME,
      parallelism: ARGON2_PARALLEL,
      hashLength: ARGON2_LENGTH,
    });
  }

  // ─── Shannon Entropy ──────────────────────────────────────────────────────
  // Measures actual information content of the password.
  // A password like "Aaaaaa1!" passes complexity rules but has ~10 bits of
  // entropy. We require >= 50 bits.
  // Formula: H = -sum(p_i * log2(p_i)) * length
  // where p_i is frequency of each unique character.

  calculateEntropy(password: string): number {
    const freq: Record<string, number> = {};
    for (const char of password) {
      freq[char] = (freq[char] || 0) + 1;
    }
    const len = password.length;
    let entropy = 0;
    for (const count of Object.values(freq)) {
      const p = count / len;
      entropy -= p * Math.log2(p);
    }
    return entropy * len;
  }

  hasAdequateEntropy(password: string): boolean {
    return this.calculateEntropy(password) >= MIN_ENTROPY_BITS;
  }

  // ─── Pattern Weakness Detection ───────────────────────────────────────────

  isPatternWeak(password: string): boolean {
    const lower = password.toLowerCase();
    const stripped = lower.replace(/[^a-z0-9]/g, '');

    for (const base of WEAK_BASES) {
      if (stripped.includes(base) || lower.includes(base)) return true;
    }

    for (const seq of SEQUENTIAL_PATTERNS) {
      if (stripped.includes(seq)) return true;
    }

    // Repeated characters (aaaaa1! etc)
    if (/(.)(\1){4,}/.test(lower)) return true;

    // Keyboard row walk (5+ consecutive characters from same row)
    for (const row of KEYBOARD_ROWS) {
      for (let i = 0; i <= row.length - 5; i++) {
        if (stripped.includes(row.slice(i, i + 5))) return true;
      }
    }

    // Pure digits + symbols with no real alpha content
    if (/^[\d\W]+$/.test(password)) return true;

    return false;
  }

  // ─── HIBP k-Anonymity Breach Check ────────────────────────────────────────
  // The complete password NEVER leaves this server.
  // We compute SHA-1 of the password, send only the first 5 hex chars to HIBP,
  // then check if our hash suffix appears in their response.
  // This is the same technique used by 1Password, Firefox Monitor, and Okta.
  // 'Add-Padding: true' prevents traffic analysis by normalising response size.

  async isBreachedPassword(password: string): Promise<boolean> {
    try {
      const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
      const prefix = sha1.slice(0, 5);
      const suffix = sha1.slice(5);

      const responseText = await this.hibpRequest(prefix);

      for (const line of responseText.split('\r\n')) {
        const [hashSuffix, countStr] = line.split(':');
        if (hashSuffix === suffix) {
          const count = parseInt(countStr, 10);
          this.logger.warn(`Password rejected: found in HIBP ${count.toLocaleString()} times`);
          return true;
        }
      }
      return false;
    } catch (error) {
      // Fail open — HIBP being down should not block legitimate registrations.
      // All other checks still run.
      this.logger.error(`HIBP check failed: ${error.message} — failing open`);
      return false;
    }
  }

  private hibpRequest(prefix: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: 'api.pwnedpasswords.com',
          path: `/range/${prefix}`,
          method: 'GET',
          headers: {
            'Add-Padding': 'true',
            'User-Agent': 'VeteranFinder-SecurityCheck/1.0',
          },
          timeout: 5000,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => resolve(data));
        }
      );
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('HIBP timeout')); });
      req.end();
    });
  }

  // ─── Password History ─────────────────────────────────────────────────────
  // Prevents reuse of the last PASSWORD_HISTORY_DEPTH passwords.
  // Hashes are compared using the same Argon2id+pepper flow to maintain
  // timing consistency.

  async isPasswordReused(userId: string, newPassword: string): Promise<boolean> {
    try {
      const history = await this.prisma.passwordHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: PASSWORD_HISTORY_DEPTH,
        select: { passwordHash: true },
      });

      for (const entry of history) {
        const matches = await this.verify(entry.passwordHash, newPassword);
        if (matches) return true;
      }
      return false;
    } catch {
      // If table doesn't exist yet, fail open
      return false;
    }
  }

  async recordPasswordHistory(userId: string, passwordHash: string): Promise<void> {
    try {
      await this.prisma.passwordHistory.create({
        data: { userId, passwordHash },
      });

      // Prune history beyond depth limit
      const old = await this.prisma.passwordHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: PASSWORD_HISTORY_DEPTH,
        select: { id: true },
      });

      if (old.length > 0) {
        await this.prisma.passwordHistory.deleteMany({
          where: { id: { in: old.map(r => r.id) } },
        });
      }
    } catch {
      // Non-critical — continue
    }
  }

  // ─── Account Lockout ──────────────────────────────────────────────────────

  isAccountLocked(user: {
    lockedUntil?: Date | null;
    failedLoginAttempts: number;
    lastFailedLoginAt?: Date | null;
  }): { locked: boolean; retryAfterMs?: number } {
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return { locked: true, retryAfterMs: user.lockedUntil.getTime() - Date.now() };
    }
    return { locked: false };
  }

  getFailedAttemptUpdate(
    currentAttempts: number,
    lastFailedAt?: Date | null,
  ): { failedLoginAttempts: number; lockedUntil: Date | null; lastFailedLoginAt: Date } {
    const shouldReset = lastFailedAt
      ? Date.now() - lastFailedAt.getTime() > RESET_WINDOW_MS
      : false;

    const attempts = shouldReset ? 1 : currentAttempts + 1;
    let lockedUntil: Date | null = null;

    if (attempts >= MAX_FAILED_ATTEMPTS) {
      lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      this.logger.warn(`Account locked after ${attempts} failed attempts`);
    }

    return { failedLoginAttempts: attempts, lockedUntil, lastFailedLoginAt: new Date() };
  }

  getSuccessfulLoginUpdate(): {
    failedLoginAttempts: number;
    lockedUntil: null;
    lastFailedLoginAt: null;
  } {
    return { failedLoginAttempts: 0, lockedUntil: null, lastFailedLoginAt: null };
  }
}

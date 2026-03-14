import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

// Load .env manually
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }
  console.log('Loaded .env from', envPath);
}

const pepper = process.env.PASSWORD_PEPPER || '';
console.log('PASSWORD_PEPPER present:', !!pepper, '| length:', pepper.length);
console.log('First 8 chars of pepper:', pepper.slice(0, 8) + '...');

async function main() {
  const password = 'Password123!';
  const peppered = pepper
    ? crypto.createHmac('sha256', pepper).update(password).digest('hex')
    : password;

  console.log('Hashing password...');
  const hash = await argon2.hash(peppered, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
    hashLength: 32,
  });
  console.log('Hash generated:', hash.slice(0, 30) + '...');

  const prisma = new PrismaClient();
  const result = await prisma.user.updateMany({
    data: {
      passwordHash: hash,
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastFailedLoginAt: null,
    },
  });
  console.log(`\n✅ Updated ${result.count} users — password is now: Password123!`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});

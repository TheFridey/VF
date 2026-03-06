/**
 * Dev-only script: resets ALL users to a temporary password with the current pepper.
 * Run from apps/api:
 *   npx ts-node reset-all-users.ts
 *
 * DELETE THIS FILE AFTER USE.
 */
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Explicitly load .env from the apps/api directory
dotenv.config({ path: path.resolve(__dirname, '.env') });

const prisma = new PrismaClient();
const TEMP_PASSWORD = 'test123';

async function resetAll() {
  console.log('\n=== Reset Script ===');
  // AuthService currently verifies raw argon2 hashes (no pepper transform).
  const hash = await argon2.hash(TEMP_PASSWORD);

  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  console.log(`\nFound ${users.length} user(s). Resetting passwords...\n`);

  for (const user of users) {
    await prisma.$executeRaw`UPDATE users SET password_hash = ${hash} WHERE id = ${user.id}`;
    console.log(`  OK  ${user.email}`);
  }

  console.log(`\nDone. Log in with: ${TEMP_PASSWORD}`);
  console.log('Delete this file after use.\n');
  await prisma.$disconnect();
}

resetAll().catch(console.error);

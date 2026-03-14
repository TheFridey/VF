/**
 * Run with: npx ts-node prisma/fix-admin.ts
 * Resets admin/moderator credentials regardless of whether they exist.
 */
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Fixing admin credentials...');

  const adminHash = await argon2.hash('Admin123!@#');
  const modHash = await argon2.hash('Moderator123!@#');

  // Use upsert so it works whether the user exists or not
  const admin = await prisma.user.upsert({
    where: { email: 'admin@veteranfinder.com' },
    update: { passwordHash: adminHash, emailVerified: true, status: 'ACTIVE', role: 'ADMIN' },
    create: {
      email: 'admin@veteranfinder.com',
      passwordHash: adminHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
      profile: { create: { displayName: 'System Admin' } },
    },
  });
  console.log('✅ Admin:', admin.email);

  const mod = await prisma.user.upsert({
    where: { email: 'mod@veteranfinder.com' },
    update: { passwordHash: modHash, emailVerified: true, status: 'ACTIVE', role: 'MODERATOR' },
    create: {
      email: 'mod@veteranfinder.com',
      passwordHash: modHash,
      role: 'MODERATOR',
      status: 'ACTIVE',
      emailVerified: true,
      profile: { create: { displayName: 'Moderator' } },
    },
  });
  console.log('✅ Moderator:', mod.email);

  console.log('\n🎯 Credentials:');
  console.log('   admin@veteranfinder.com  /  Admin123!@#');
  console.log('   mod@veteranfinder.com    /  Moderator123!@#');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

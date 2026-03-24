import { PrismaClient, UserRole } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { seedBlogPosts } from './blog-posts.seed';

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;

    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

const apiRoot = path.resolve(__dirname, '..');
loadEnvFile(path.join(apiRoot, '.env.local'));
loadEnvFile(path.join(apiRoot, '.env'));

const prisma = new PrismaClient();

async function main() {
  const preferredEmail = process.env.BLOG_AUTHOR_EMAIL?.trim().toLowerCase();

  const author = preferredEmail
    ? await prisma.user.findFirst({
        where: { email: preferredEmail },
        select: { id: true, email: true, role: true },
      })
    : await prisma.user.findFirst({
        where: { role: { in: [UserRole.ADMIN, UserRole.MODERATOR] } },
        orderBy: [{ role: 'desc' }, { createdAt: 'asc' }],
        select: { id: true, email: true, role: true },
      });

  if (!author) {
    throw new Error(
      'No admin or moderator user found for blog seeding. Set BLOG_AUTHOR_EMAIL or create an admin account first.',
    );
  }

  console.log(`📰 Seeding blog posts as ${author.email} (${author.role})`);
  await seedBlogPosts(prisma, author.id);
}

main()
  .catch((error) => {
    console.error('❌ Blog post seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

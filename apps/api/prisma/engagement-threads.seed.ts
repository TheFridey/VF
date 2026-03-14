/**
 * BIA engagement seed — pinned "conversation starter" threads.
 *
 * These are seeded into the main BIA forum categories on first deployment
 * to give new members something to read and respond to immediately.
 *
 * Usage: call seedEngagementThreads(prisma, adminUserId) from the main seed.ts
 * after the admin user and forum categories have been created.
 */
import { PrismaClient } from '@prisma/client';

export const PINNED_ENGAGEMENT_THREADS = [
  {
    categorySlug: 'general',
    title: 'Where did everyone end up after leaving?',
    content: `The question everyone asks at every reunion. Where are you now — career, location, what you're up to? 

Whether you transitioned smoothly, struggled, or are still figuring it out — no judgement here. This community exists precisely for this.

I'll start: left the Army in 2018 after 12 years, REME. Went into facilities management for a couple of years before retraining in cybersecurity. Currently working for a defence contractor in Bristol. Took a while to find my feet but got there.

Your turn.`,
  },
  {
    categorySlug: 'general',
    title: 'The things civvies say — the definitive thread',
    content: `We've all had them. The comments that make you wonder if they genuinely believe what they're saying.

"You must have killed people."
"Do you have PTSD?" (asked within 30 seconds of finding out you served)
"But didn't you feel bad about the war?"

Share yours. Sometimes you just need to vent to people who actually get it.`,
  },
  {
    categorySlug: 'transition',
    title: 'What nobody tells you about leaving: the realities',
    content: `The transition brief covers the practical stuff — CV writing, pension, resettlement grants. It doesn't cover the rest of it.

The loss of identity. The strange feeling that Monday morning has no structure. The way you miss the banter even when you didn't always love the job. The unexpected loneliness.

This thread is for the unfiltered version of transition. What actually caught you off guard? What do you wish someone had told you before you handed in your kit?`,
  },
  {
    categorySlug: 'transition',
    title: 'Useful resources that actually helped (not the standard list)',
    content: `There's a lot of "support" out there that amounts to a leaflet and a phone number. This thread is for the things that genuinely made a difference.

Share:
- Organisations that came through for you
- Books, courses, certifications worth the time
- Contacts in specific industries
- Things that helped with the mental side

Keep it practical. The goal is a living resource list the community actually uses.`,
  },
  {
    categorySlug: 'ops-and-experiences',
    title: 'Herrick veterans — who else is here?',
    content: `Whether you were Helmand 2006 or Helmand 2013, whether you were infantry, logistic, int or medic — if you deployed on Op HERRICK this thread is for you.

No operational details. Just veterans connecting with people who share a reference point that most people around them don't.

Tour, unit (as general as you're comfortable), year. That's enough to start finding your people.`,
  },
];

export async function seedEngagementThreads(
  prisma: PrismaClient,
  authorId: string,
): Promise<void> {
  for (const thread of PINNED_ENGAGEMENT_THREADS) {
    const category = await prisma.forumCategory.findUnique({
      where: { slug: thread.categorySlug },
    });

    if (!category) {
      console.warn(`[Seed] Category '${thread.categorySlug}' not found, skipping thread: ${thread.title}`);
      continue;
    }

    // Upsert by title + category — idempotent
    const existing = await prisma.forumThread.findFirst({
      where: { categoryId: category.id, title: thread.title },
    });

    if (existing) {
      // Ensure it's still pinned
      await prisma.forumThread.update({
        where: { id: existing.id },
        data: { isPinned: true },
      });
      continue;
    }

    const newThread = await prisma.forumThread.create({
      data: {
        categoryId: category.id,
        authorId,
        title: thread.title,
        isPinned: true,
        postCount: 1,
        lastPostAt: new Date(),
      },
    });

    // Create the opening post
    await prisma.forumPost.create({
      data: {
        threadId: newThread.id,
        authorId,
        content: thread.content,
      },
    });

    console.log(`[Seed] Created pinned thread: "${thread.title}" in #${thread.categorySlug}`);
  }
}

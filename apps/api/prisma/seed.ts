import { PrismaClient, UserRole, UserStatus, Gender, MilitaryBranch, ReportReason, ReportStatus } from '@prisma/client';
import { UK_REGIMENTS } from '../src/common/constants/regiments';
import { ConnectionType, ConnectionStatus } from '../src/common/enums/connection.enum';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { seedBlogPosts } from './blog-posts.seed';

// ── Load env vars in same priority order as NestJS ConfigModule ───────────────
// NestJS uses envFilePath: ['.env.local', '.env'] — .env.local wins.
// `prisma db seed` only loads .env automatically, so we must do this manually
// or PASSWORD_PEPPER mismatches between seed and running service.
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
    // Only set if not already in environment (shell vars take highest priority)
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}
const apiRoot = path.resolve(__dirname, '..');
loadEnvFile(path.join(apiRoot, '.env.local')); // highest priority
loadEnvFile(path.join(apiRoot, '.env'));        // fallback

const prisma = new PrismaClient();

// ── Password hashing — MUST match PasswordSecurityService exactly ─────────────
// The service applies a HMAC-SHA256 pepper before hashing.  If the seed hashes
// without pepper the stored hash will never match a login attempt.
function applyPepper(password: string): string {
  const pepper = process.env.PASSWORD_PEPPER;
  if (!pepper) return password; // dev fallback — matches service behaviour
  return crypto.createHmac('sha256', pepper).update(password).digest('hex');
}

async function hashPassword(password: string): Promise<string> {
  return argon2.hash(applyPepper(password), {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
    hashLength: 32,
  });
}

// Encryption for messages - MUST match messaging.service.ts exactly
function encryptMessage(text: string): { encryptedContent: string; iv: string; authTag: string } {
  const key = process.env.ENCRYPTION_KEY || 'default-dev-encryption-key-32ch';
  // Use scryptSync with same params as service
  const encryptionKey = crypto.scryptSync(key, 'salt', 32);
  const iv = crypto.randomBytes(16); // 16 bytes like service
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'base64'); // base64 like service
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag().toString('base64'); // base64 like service
  
  return {
    encryptedContent: encrypted,
    iv: iv.toString('base64'),
    authTag,
  };
}

const STANDARD_FORUM_CATEGORIES = [
  {
    slug: 'getting-started',
    name: 'Getting Started',
    description: 'New to VeteranFinder BIA? Start here.',
    icon: 'Rocket',
    sortOrder: 1,
    tier: 'BIA',
  },
  {
    slug: 'introduce-yourself',
    name: 'Introduce Yourself',
    description: 'Tell the community who you are and where you served.',
    icon: 'Hand',
    sortOrder: 2,
    tier: 'BIA',
  },
  {
    slug: 'veterans-support',
    name: 'Veterans Support',
    description: 'Share experiences, advice and support one another.',
    icon: 'Heart',
    sortOrder: 3,
    tier: 'BIA',
  },
  {
    slug: 'general-discussion',
    name: 'General Discussion',
    description: 'Anything and everything - keep it clean, keep it real.',
    icon: 'MessageSquare',
    sortOrder: 4,
    tier: 'BIA',
  },
  {
    slug: 'bunker-general',
    name: 'The Bunker',
    description: 'BIA+ exclusive - unrestricted discussion.',
    icon: 'Shield',
    sortOrder: 5,
    tier: 'BIA_PLUS',
  },
  {
    slug: 'ops-room',
    name: 'Ops Room',
    description: 'Tactical career and business discussions.',
    icon: 'Briefcase',
    sortOrder: 6,
    tier: 'BIA_PLUS',
  },
  {
    slug: 'classified',
    name: 'Classified',
    description: 'BIA+ members only - the inner circle.',
    icon: 'Lock',
    sortOrder: 7,
    tier: 'BIA_PLUS',
  },
] as const;

const REGIMENT_FORUM_TEMPLATES = [
  { suffix: 'general',  name: 'General Discussion',      icon: 'MessageSquare', description: (r: string) => `General chat and announcements for ${r} veterans` },
  { suffix: 'history',  name: 'History & Heritage',      icon: 'Shield',        description: (r: string) => `${r} history, traditions, battle honours and proud moments` },
  { suffix: 'reunions', name: 'Reunions & Events',       icon: 'Users',         description: (r: string) => `Upcoming ${r} reunions, regimental dinners and veteran meetups` },
  { suffix: 'support',  name: 'Veterans Support',        icon: 'Heart',         description: (r: string) => `Mental health resources, transition advice and mutual support for ${r} veterans` },
  { suffix: 'ops',      name: 'Operations & Deployments', icon: 'Rocket',       description: (r: string) => `Stories, memories and discussions from ${r} operations and tours of duty` },
] as const;

const REGIMENT_BRANCH_CONTEXT: Record<string, {
  serviceLabel: string;
  environment: string;
  culture: string;
  transitionFocus: string;
  historyFocus: string;
}> = {
  BRITISH_ARMY: {
    serviceLabel: 'Army',
    environment: 'battalion life, exercises, postings, and tours',
    culture: 'regimental identity, soldiering stories, and the culture of the mess',
    transitionFocus: 'leadership, operations, logistics, and practical civilian careers',
    historyFocus: 'battle honours, campaigns, and long regimental lineages',
  },
  ROYAL_MARINES: {
    serviceLabel: 'Royal Marines',
    environment: 'commando training, winter deployments, detachments, and amphibious operations',
    culture: 'green lid standards, detachment humour, and commando pride',
    transitionFocus: 'high-performance teams, security, resilience, and specialist operations roles',
    historyFocus: 'commando traditions, specialist tasks, and notable deployments',
  },
  ROYAL_NAVY: {
    serviceLabel: 'Royal Navy',
    environment: 'ship life, watches, ports, deployments, and life alongside',
    culture: 'shipboard routines, branch banter, and life in the fleet',
    transitionFocus: 'engineering, maritime operations, systems work, and leadership afloat or ashore',
    historyFocus: 'ships, squadrons, sea service heritage, and fleet milestones',
  },
  ROYAL_AIR_FORCE: {
    serviceLabel: 'Royal Air Force',
    environment: 'stations, squadrons, flight line routines, and operational support',
    culture: 'squadron identity, station life, and professional trade mastery',
    transitionFocus: 'technical trades, aviation, engineering, project delivery, and command support',
    historyFocus: 'squadron records, station heritage, and operational achievements',
  },
  RESERVE_FORCES: {
    serviceLabel: 'Reserve Forces',
    environment: 'balancing civilian life, training weekends, mobilisation, and specialist support',
    culture: 'part-time service commitment, adaptability, and strong small-team bonds',
    transitionFocus: 'blending civilian careers with service experience and veteran networking',
    historyFocus: 'reserve contribution, mobilisation stories, and unit continuity',
  },
};

type SeedForumCategory = {
  id: string;
  slug: string;
  name: string;
  tier: string;
  regiment?: string | null;
};

type SeedForumThread = {
  title: string;
  content: string;
  daysAgo: number;
  isPinned?: boolean;
  isLocked?: boolean;
  viewCount?: number;
};

function buildStandardForumThreads(category: SeedForumCategory): SeedForumThread[] {
  switch (category.slug) {
    case 'getting-started':
      return [
        {
          title: 'Welcome to the BIA forums - start here',
          content: 'This is the best place to get your bearings. Share which branch you served in, what you want from the community, and what kind of introductions or support would help most.',
          daysAgo: 28,
          isPinned: true,
          viewCount: 74,
        },
        {
          title: 'How to get the most out of VeteranFinder',
          content: 'Use this thread to swap practical tips for using the forums, finding your regiment space, and making the most of mentorship, business listings, and member introductions.',
          daysAgo: 21,
          viewCount: 49,
        },
        {
          title: 'What brought you to the community?',
          content: 'Some members are here to reconnect, some are here for support, and some just want solid company. Let us know what brought you in and what you hope to find.',
          daysAgo: 15,
          viewCount: 41,
        },
        {
          title: 'First-week checklist for new members',
          content: 'Introduce yourself, complete your profile, explore your regiment forums, and say hello in a thread that matches your interests. If you are new, this is a good place to ask quick questions.',
          daysAgo: 9,
          viewCount: 33,
        },
      ];
    case 'introduce-yourself':
      return [
        {
          title: 'Roll call: tell us where you served',
          content: 'Introduce yourself with your branch, regiment or unit, where you are based now, and what you are getting up to in civvy street.',
          daysAgo: 26,
          isPinned: true,
          viewCount: 67,
        },
        {
          title: 'What is your story since leaving service?',
          content: 'Whether you went into business, family life, study, or a completely different trade, share how life has changed since leaving the forces.',
          daysAgo: 20,
          viewCount: 44,
        },
        {
          title: 'Hobby and interests check-in',
          content: 'Let the community know what keeps you busy outside work. It might be fitness, gaming, fishing, motorsport, volunteering, or something totally unexpected.',
          daysAgo: 12,
          viewCount: 35,
        },
        {
          title: 'Who are you hoping to reconnect with?',
          content: 'If you are looking for old oppos, shipmates, detachment mates, or people from a particular tour or posting, post the details here and let others point you in the right direction.',
          daysAgo: 7,
          viewCount: 29,
        },
      ];
    case 'veterans-support':
      return [
        {
          title: 'Weekly check-in thread',
          content: 'Use this space for an honest check-in. If things are going well, say so. If the week has been rough, you do not need to carry it on your own.',
          daysAgo: 24,
          isPinned: true,
          viewCount: 58,
        },
        {
          title: 'Best advice for transition to civilian life',
          content: 'What genuinely helped when you left service? Share lessons on routine, work, family life, identity, and the small habits that made a difference.',
          daysAgo: 19,
          viewCount: 46,
        },
        {
          title: 'Charities, services, and support that actually helped',
          content: 'Recommend organisations, local groups, or practical services that have been useful for mental health, housing, finance, or family support.',
          daysAgo: 11,
          viewCount: 39,
        },
        {
          title: 'Staying connected after service',
          content: 'Isolation can creep in quietly. Share what helps you stay connected, whether that is meetups, messaging old mates, volunteering, training, or just having a regular brew with someone.',
          daysAgo: 5,
          viewCount: 31,
        },
      ];
    case 'general-discussion':
      return [
        {
          title: 'What is everyone focused on this month?',
          content: 'Use this thread for a proper general catch-up. Work projects, family wins, training goals, travel plans, or anything else worth sharing is welcome here.',
          daysAgo: 23,
          isPinned: true,
          viewCount: 52,
        },
        {
          title: 'Best books, podcasts, or documentaries lately',
          content: 'Recommend something worth watching, reading, or listening to. Veteran stories, history, comedy, business, or completely random suggestions all count.',
          daysAgo: 17,
          viewCount: 38,
        },
        {
          title: 'Fitness routines that still keep you honest',
          content: 'What training are you sticking with nowadays? Share routines, injuries to work around, or simple ways to stay disciplined without a PTI breathing down your neck.',
          daysAgo: 10,
          viewCount: 34,
        },
        {
          title: 'Small wins worth celebrating',
          content: 'Promotion, new job, house move, better sleep, first 5k back, or just getting through a hard week. Drop your wins here so the rest of the community can raise a glass.',
          daysAgo: 4,
          viewCount: 27,
        },
      ];
    case 'bunker-general':
      return [
        {
          title: 'BIA+ members lounge',
          content: 'This is a relaxed space for BIA+ members to talk more freely, make introductions, and start conversations that do not fit neatly anywhere else.',
          daysAgo: 22,
          isPinned: true,
          viewCount: 61,
        },
        {
          title: 'What are you building or planning right now?',
          content: 'Business ideas, side projects, training plans, relocation plans, or a fresh start after service - talk through what you are working toward.',
          daysAgo: 16,
          viewCount: 43,
        },
        {
          title: 'High-trust networking thread',
          content: 'If you are open to introductions, collaborations, or swapping specialist knowledge, post what you do and what sort of people you would like to connect with.',
          daysAgo: 8,
          viewCount: 36,
        },
        {
          title: 'What topics do you want more of in The Bunker?',
          content: 'Tell us which discussions would make this space more valuable, from leadership and investing to entrepreneurship, resilience, and long-form Q and A threads.',
          daysAgo: 3,
          viewCount: 25,
        },
      ];
    case 'ops-room':
      return [
        {
          title: 'Business owners and operators roll call',
          content: 'If you run a business, freelance, lead a team, or are building something from scratch, introduce yourself and say what sector you are in.',
          daysAgo: 21,
          isPinned: true,
          viewCount: 55,
        },
        {
          title: 'Hiring, interviews, and career moves',
          content: 'Share roles you are hiring for, industries that are opening up, or practical interview advice for veterans moving into leadership and operations work.',
          daysAgo: 14,
          viewCount: 42,
        },
        {
          title: 'Remote work, consulting, and contract opportunities',
          content: 'This thread is for swapping leads, lessons, and warnings on remote work, consulting gigs, and contract roles that suit a veteran skill set.',
          daysAgo: 9,
          viewCount: 33,
        },
        {
          title: 'What business skill was hardest to learn after service?',
          content: 'Finance, sales, networking, delegation, marketing, or something else entirely - talk through the civilian business skills that took time to build.',
          daysAgo: 2,
          viewCount: 24,
        },
      ];
    case 'classified':
      return [
        {
          title: 'Trusted introductions thread',
          content: 'Use this for thoughtful, high-trust introductions between members. Include enough context so people know what you are working on and where a useful connection could help.',
          daysAgo: 18,
          isPinned: true,
          viewCount: 47,
        },
        {
          title: 'Accountability thread for serious goals',
          content: 'Post one goal you are committed to this quarter and what support, challenge, or accountability would keep you moving.',
          daysAgo: 13,
          viewCount: 37,
        },
        {
          title: 'Resources worth sharing with the inner circle',
          content: 'If you have a genuinely useful template, process, reading list, tool, or introduction strategy, share it here so the rest of the group can benefit.',
          daysAgo: 6,
          viewCount: 28,
        },
        {
          title: 'Mentors, specialists, and quiet professionals',
          content: 'This is a space to flag up the kinds of expertise you can offer or the kind you are looking for, especially when discretion matters.',
          daysAgo: 1,
          viewCount: 20,
        },
      ];
    default:
      return [];
  }
}

function buildRegimentForumThreads(category: SeedForumCategory): SeedForumThread[] {
  const regimentInfo = UK_REGIMENTS.find((regiment) => regiment.slug === category.regiment);
  const regimentName = regimentInfo?.name ?? 'this regiment';

  if (category.slug.endsWith('-general')) {
    return [
      {
        title: `${regimentName} roll call`,
        content: `If you served with ${regimentName}, introduce yourself here. Let everyone know when you served, where you are based now, and what you would like to see from this forum.`,
        daysAgo: 27,
        isPinned: true,
        viewCount: 45,
      },
      {
        title: `Where did ${regimentName} take you?`,
        content: `Share the postings, exercises, deployments, and unexpected places your time with ${regimentName} took you. The details are often what spark old connections.`,
        daysAgo: 19,
        viewCount: 31,
      },
      {
        title: `Photos, kit, and keepsakes from ${regimentName}`,
        content: `Whether it is a beret badge, a battered notebook, a course photo, or a funny bit of issued kit, tell the story behind the items you still have.`,
        daysAgo: 10,
        viewCount: 22,
      },
      {
        title: `What is everyone doing after ${regimentName}?`,
        content: `Use this thread to catch up on what life looks like after service: work, family, projects, study, travel, or anything else members are getting stuck into.`,
        daysAgo: 4,
        viewCount: 18,
      },
    ];
  }

  if (category.slug.endsWith('-history')) {
    return [
      {
        title: `Proudest moments in ${regimentName} history`,
        content: `Which moments, campaigns, traditions, or battle honours stand out most when you think about ${regimentName}? Share the stories and reasons they still matter.`,
        daysAgo: 25,
        isPinned: true,
        viewCount: 34,
      },
      {
        title: `Traditions and customs worth preserving`,
        content: `From mess traditions to parade details and nicknames only insiders understand, this is a place to capture the culture that made ${regimentName} distinctive.`,
        daysAgo: 17,
        viewCount: 26,
      },
      {
        title: `Best books, museums, and archives for ${regimentName}`,
        content: `Recommend the books, museum collections, associations, or archive resources that do the best job of telling the ${regimentName} story.`,
        daysAgo: 8,
        viewCount: 19,
      },
      {
        title: `Stories passed down from older hands`,
        content: `Many of the best regimental stories are the ones told in person. Share the ones you heard from older veterans and why they stuck with you.`,
        daysAgo: 3,
        viewCount: 16,
      },
    ];
  }

  if (category.slug.endsWith('-reunions')) {
    return [
      {
        title: `Next ${regimentName} reunion - who is up for it?`,
        content: `Use this thread to sound out interest for the next reunion, dinner, or informal get-together for ${regimentName} veterans.`,
        daysAgo: 24,
        isPinned: true,
        viewCount: 30,
      },
      {
        title: `Regional meetups for ${regimentName} veterans`,
        content: `Not everyone can make a national event, so use this space to organise smaller local meetups by region, city, or county.`,
        daysAgo: 15,
        viewCount: 24,
      },
      {
        title: `Ideas for reunion venues and formats`,
        content: `What actually makes a good veteran event for ${regimentName}? Share venue ideas, formats, dates, and ways to make events easy for more people to attend.`,
        daysAgo: 7,
        viewCount: 17,
      },
      {
        title: `Who is willing to help organise?`,
        content: `If you are happy to help with venues, contacts, ticketing, notices, or just rallying the troops, drop your name here and coordinate with others.`,
        daysAgo: 2,
        viewCount: 12,
      },
    ];
  }

  if (category.slug.endsWith('-support')) {
    return [
      {
        title: `${regimentName} welfare and support check-in`,
        content: `This thread is here for practical support and a bit of mutual watchfulness. If you need a steer, or if you have experience that could help someone else, speak up.`,
        daysAgo: 23,
        isPinned: true,
        viewCount: 29,
      },
      {
        title: `Transition advice from former ${regimentName} veterans`,
        content: `Share the lessons that helped when leaving service, especially around routine, work, identity, and staying connected after life in ${regimentName}.`,
        daysAgo: 16,
        viewCount: 21,
      },
      {
        title: `Employment and networking leads for the regiment`,
        content: `If you know of good employers, veteran-friendly teams, or networking groups that fellow ${regimentName} veterans should know about, add them here.`,
        daysAgo: 9,
        viewCount: 18,
      },
      {
        title: `How do we look after our own better?`,
        content: `Talk through what practical support, outreach, or signposting would make this space genuinely useful for current and former members of ${regimentName}.`,
        daysAgo: 3,
        viewCount: 14,
      },
    ];
  }

  if (category.slug.endsWith('-ops')) {
    return [
      {
        title: `${regimentName} tours and deployment memories`,
        content: `Use this thread for stories, reflections, and memories from operations, exercises, or deployments with ${regimentName}. Keep it respectful and use judgment with details.`,
        daysAgo: 22,
        isPinned: true,
        viewCount: 32,
      },
      {
        title: `Hardest exercise or tour with ${regimentName}`,
        content: `What tested you the most during your time with ${regimentName}, and what did it teach you about the unit, the job, or yourself?`,
        daysAgo: 14,
        viewCount: 24,
      },
      {
        title: `Lessons learned that still stick today`,
        content: `Share the professional habits, fieldcraft, leadership lessons, or bits of wisdom from ${regimentName} that you still carry into civilian life.`,
        daysAgo: 6,
        viewCount: 17,
      },
      {
        title: `Training serials and moments nobody forgets`,
        content: `Every regiment has the training stories people tell years later. Add the exercises, ranges, inspections, or mad moments that still get talked about.`,
        daysAgo: 1,
        viewCount: 13,
      },
    ];
  }

  return [
    {
      title: `${category.name} starter thread`,
      content: `Welcome to ${category.name}. Use this thread to get conversations started and help shape this forum into something useful for the community.`,
      daysAgo: 7,
      isPinned: true,
      viewCount: 12,
    },
    {
      title: `What would you like to discuss in ${category.name}?`,
      content: `If there are topics this forum should cover, post them here so other members can jump in and build the conversation.`,
      daysAgo: 4,
      viewCount: 8,
    },
    {
      title: `Helpful resources for ${category.name}`,
      content: 'Share links, recommendations, and practical information that would make this part of the forum more useful.',
      daysAgo: 2,
      viewCount: 6,
    },
    {
      title: `Community check-in`,
      content: 'Say hello, share what you are focused on, and let others know what kind of conversations would be most helpful here.',
      daysAgo: 1,
      viewCount: 5,
    },
  ];
}

function buildSignatureForumThread(category: SeedForumCategory): SeedForumThread | null {
  if (category.tier === 'REGIMENT') {
    const regimentInfo = UK_REGIMENTS.find((regiment) => regiment.slug === category.regiment);
    if (!regimentInfo) return null;

    const context = REGIMENT_BRANCH_CONTEXT[regimentInfo.branch] ?? {
      serviceLabel: 'service',
      environment: 'service life, postings, and deployments',
      culture: 'unit identity and the stories people carry forward',
      transitionFocus: 'practical next steps after service',
      historyFocus: 'heritage, milestones, and shared memory',
    };

    if (category.slug.endsWith('-general')) {
      return {
        title: `${regimentInfo.name}: life, culture, and identity`,
        content: `For veterans from ${regimentInfo.name}, this thread is about the small details that made the unit feel like home: ${context.environment}, ${context.culture}, and the people who made the hardest days manageable. If you served in ${regimentInfo.category}, add the routines, sayings, personalities, and moments that still define ${regimentInfo.name} for you.`,
        daysAgo: 2,
        viewCount: 15,
      };
    }

    if (category.slug.endsWith('-history')) {
      return {
        title: `Resources that tell the ${regimentInfo.name} story properly`,
        content: `This forum should become a useful archive for ${regimentInfo.name}. Share books, museums, old journals, association newsletters, memorial sites, photo collections, and oral histories that best capture ${context.historyFocus}. If a source gets the detail wrong, say that too and help point people toward better material.`,
        daysAgo: 1,
        viewCount: 14,
      };
    }

    if (category.slug.endsWith('-reunions')) {
      return {
        title: `${regimentInfo.name} calendar: dinners, association events, and annual gatherings`,
        content: `Use this thread to keep one practical running list of events for ${regimentInfo.name}: reunions, remembrance parades, regimental association meetings, charity fundraisers, and informal local get-togethers. Include dates, locations, dress or ticket details, and whether new attendees or families are welcome.`,
        daysAgo: 1,
        viewCount: 12,
      };
    }

    if (category.slug.endsWith('-support')) {
      return {
        title: `${regimentInfo.name} careers, welfare, and trusted contacts`,
        content: `For many veterans, the most valuable support is specific and practical. If you know welfare contacts, association reps, veteran-friendly employers, training schemes, or reliable peer-support routes that help former ${regimentInfo.name} personnel, add them here. Advice tied to ${context.transitionFocus} is especially useful.`,
        daysAgo: 1,
        viewCount: 13,
      };
    }

    if (category.slug.endsWith('-ops')) {
      return {
        title: `${regimentInfo.name} lessons, leadership, and professional standards`,
        content: `Beyond the stories themselves, what professional habits from ${regimentInfo.name} still stand out? Talk about leadership, field standards, tradecraft, humour under pressure, and the lessons that carried from ${context.serviceLabel} service into later life. This is the place for thoughtful reflections rather than just war stories.`,
        daysAgo: 1,
        viewCount: 14,
      };
    }
  }

  switch (category.slug) {
    case 'getting-started':
      return {
        title: 'Questions new members often ask in their first week',
        content: 'If you were new to the BIA space, what would you want explained clearly on day one? Use this thread to post the practical questions members actually have about memberships, regiment access, introductions, posting etiquette, and how to find the most useful conversations quickly.',
        daysAgo: 3,
        viewCount: 26,
      };
    case 'introduce-yourself':
      return {
        title: 'Service background, current mission, next chapter',
        content: 'A strong introduction often covers three things: where you served, what life looks like now, and where you want to head next. If you are unsure what to write in your introduction, use this thread as a prompt and give people enough context to connect properly.',
        daysAgo: 2,
        viewCount: 23,
      };
    case 'veterans-support':
      return {
        title: 'Support that felt practical rather than performative',
        content: 'Veterans usually know the difference between advice that sounds good and advice that actually helps. Share the routines, conversations, services, and habits that genuinely moved the needle for you or someone close to you.',
        daysAgo: 2,
        viewCount: 24,
      };
    case 'general-discussion':
      return {
        title: 'What should the wider BIA community talk about more?',
        content: 'This thread is for steering the overall tone of the forums. If there are conversations missing from the community, or subjects that deserve more thoughtful discussion, post them here and help shape the direction of the section.',
        daysAgo: 1,
        viewCount: 18,
      };
    case 'general':
      return {
        title: 'Open floor: what deserves more conversation here?',
        content: 'Use this as a true general room thread for anything that does not quite fit another forum but still matters to the veteran community. Good posts here usually bring a clear topic, a bit of context, and enough detail to draw in the right people.',
        daysAgo: 1,
        viewCount: 18,
      };
    case 'mental-health':
      return {
        title: 'What helped when you were not ready to ask for help yet?',
        content: 'This thread is for practical insight rather than polished slogans. If there were habits, people, routines, services, or warning signs that made a real difference before or during a difficult period, share them here in a way that might help someone else recognise their own next step.',
        daysAgo: 1,
        viewCount: 19,
      };
    case 'ops-and-tours':
      return {
        title: 'Operations, tours, and the things that stayed with you',
        content: 'Not every memory from deployment is dramatic, and not every lesson arrives in the moment. This is the place for reflections on tours, leadership, tempo, humour, standards, and the details that stayed with you after coming home.',
        daysAgo: 1,
        viewCount: 17,
      };
    case 'the-bunker':
      return {
        title: 'What should make this premium room genuinely different?',
        content: 'If The Bunker is going to feel worth paying for, it should offer a different quality of discussion. Use this thread to suggest the kinds of deeper conversations, access, and trust-driven exchanges that should define the space.',
        daysAgo: 1,
        viewCount: 18,
      };
    case 'transition':
      return {
        title: 'The hardest part of Civvy Street that nobody explained properly',
        content: 'This thread is for honest, practical transition advice. Whether the difficulty was identity, money, routine, family life, applications, confidence, or simply feeling out of place, share what caught you off guard and what helped you get traction again.',
        daysAgo: 1,
        viewCount: 20,
      };
    case 'bunker-general':
      return {
        title: 'Where should The Bunker go next?',
        content: 'BIA+ members can help define the premium side of the community here. Suggest the kinds of deeper conversations, roundtables, introductions, or expert-led threads that would make The Bunker feel genuinely worth returning to.',
        daysAgo: 1,
        viewCount: 19,
      };
    case 'ops-room':
      return {
        title: 'Operator to operator: what strategic advice matters most now?',
        content: 'Use this thread for the higher-level advice that helps veterans build strong second careers: positioning, networks, reputation, pricing, leadership, business development, and spotting the difference between busy work and progress.',
        daysAgo: 1,
        viewCount: 17,
      };
    case 'classified':
      return {
        title: 'Quiet asks, trusted help, and serious introductions',
        content: 'If you need a high-trust introduction, a discreet sense check, or experienced eyes on a serious decision, this is the thread to explain the context clearly and ask for support from the inner circle.',
        daysAgo: 1,
        viewCount: 16,
      };
    default:
      return null;
  }
}

function getForumThreadsForCategory(category: SeedForumCategory): SeedForumThread[] {
  const baseThreads = category.tier === 'REGIMENT'
    ? buildRegimentForumThreads(category)
    : buildStandardForumThreads(category);

  const fallbackThreads = [
    {
      title: `Welcome to ${category.name}`,
      content: `Use this thread to kick off discussion in ${category.name} and help set the tone for the forum.`,
      daysAgo: 7,
      isPinned: true,
      viewCount: 12,
    },
    {
      title: `Best conversations for ${category.name}`,
      content: 'Share the kinds of questions, stories, and discussions you would most like to see here.',
      daysAgo: 4,
      viewCount: 9,
    },
    {
      title: `Useful advice and resources`,
      content: 'Add anything practical that would help this community forum become more valuable over time.',
      daysAgo: 2,
      viewCount: 7,
    },
    {
      title: `Open discussion`,
      content: 'A simple open thread for members to post updates, questions, and ideas related to this forum.',
      daysAgo: 1,
      viewCount: 5,
    },
  ];

  const signatureThread = buildSignatureForumThread(category);
  const resolvedThreads = baseThreads.length > 0 ? baseThreads : fallbackThreads;

  return signatureThread
    ? [...resolvedThreads, signatureThread]
    : resolvedThreads;
}

async function ensureForumThread(categoryId: string, authorId: string, thread: SeedForumThread): Promise<boolean> {
  const existing = await prisma.forumThread.findFirst({
    where: {
      categoryId,
      authorId,
      title: thread.title,
    },
    select: { id: true },
  });

  if (existing) return false;

  const createdAt = new Date(Date.now() - (thread.daysAgo * 24 * 60 * 60 * 1000));

  await prisma.forumThread.create({
    data: {
      categoryId,
      authorId,
      title: thread.title,
      isPinned: thread.isPinned ?? false,
      isLocked: thread.isLocked ?? false,
      viewCount: thread.viewCount ?? 0,
      postCount: 1,
      lastPostAt: createdAt,
      createdAt,
      posts: {
        create: {
          authorId,
          content: thread.content,
          createdAt,
        },
      },
    },
  });

  return true;
}

async function main() {
  console.log('🌱 Seeding database with comprehensive test data...');
  console.log('');

  const defaultPassword = await hashPassword('Password123!');
  const adminPassword = await hashPassword('Admin123!@#');
  const modPassword = await hashPassword('Moderator123!@#');

  // ============ ADMIN & MODERATOR ============
  const admin = await prisma.user.upsert({
    where: { email: 'admin@veteranfinder.com' },
    update: {
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
    create: {
      email: 'admin@veteranfinder.com',
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      profile: {
        create: {
          displayName: 'Admin',
          bio: 'Platform administrator',
        },
      },
    },
  });
  await prisma.profile.upsert({
    where: { userId: admin.id },
    update: {
      displayName: 'Admin',
      bio: 'Platform administrator',
    },
    create: {
      userId: admin.id,
      displayName: 'Admin',
      bio: 'Platform administrator',
      isVisible: true,
    },
  });
  console.log('✅ Admin:', admin.email);

  const moderator = await prisma.user.upsert({
    where: { email: 'moderator@veteranfinder.com' },
    update: { emailVerified: true, status: UserStatus.ACTIVE, role: UserRole.MODERATOR },
    create: {
      email: 'moderator@veteranfinder.com',
      passwordHash: modPassword,
      role: UserRole.MODERATOR,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      profile: {
        create: {
          displayName: 'Content Moderator',
          bio: 'Community moderator',
        },
      },
    },
  });
  console.log('✅ Moderator:', moderator.email);

  // ============ VERIFIED VETERANS ============
  
  // John - Army veteran (main test account)
  const john = await prisma.user.upsert({
    where: { email: 'john.doe@example.com' },
    update: { emailVerified: true, status: UserStatus.ACTIVE, role: UserRole.VETERAN_VERIFIED },
    create: {
      email: 'john.doe@example.com',
      passwordHash: defaultPassword,
      role: UserRole.VETERAN_VERIFIED,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      profile: {
        create: {
          displayName: 'John D.',
          bio: 'Army veteran, 10 years service. Looking to reconnect with fellow soldiers and rebuild old friendships.',
          gender: Gender.MALE,
          dateOfBirth: new Date('1985-03-15'),
          location: 'Manchester, UK',
          latitude: 53.4808,
          longitude: -2.2426,
          interests: ['hiking', 'fishing', 'motorcycles', 'veterans support', 'photography'],
          isVisible: true,
        },
      },
      veteranDetails: {
        create: {
          branch: MilitaryBranch.ARMY,
          rank: 'Staff Sergeant (E-6)',
          mos: '11B - Infantryman',
          dutyStations: ['Fort Bragg, NC', 'Fort Hood, TX', 'Camp Pendleton, CA'],
          deployments: ['Iraq 2007-2008', 'Afghanistan 2010-2011', 'Afghanistan 2013'],
          servicePeriods: {
            create: [
              {
                branch: MilitaryBranch.ARMY,
                startDate: new Date('2005-06-01'),
                endDate: new Date('2015-06-01'),
                unit: '82nd Airborne Division',
                dutyStation: 'Fort Bragg, NC',
              },
            ],
          },
        },
      },
    },
  });
  console.log('✅ Veteran:', john.email);

  // Sarah - Navy veteran (matched with John)
  const sarah = await prisma.user.upsert({
    where: { email: 'sarah.smith@example.com' },
    update: { emailVerified: true, status: UserStatus.ACTIVE, role: UserRole.VETERAN_VERIFIED },
    create: {
      email: 'sarah.smith@example.com',
      passwordHash: defaultPassword,
      role: UserRole.VETERAN_VERIFIED,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      profile: {
        create: {
          displayName: 'Sarah S.',
          bio: 'Navy veteran, served on the HMS Dragon. Now working in cybersecurity. Always happy to reconnect with old shipmates.',
          gender: Gender.FEMALE,
          dateOfBirth: new Date('1988-07-22'),
          location: 'Virginia Beach, VA',
          latitude: 36.8529,
          longitude: -75.9780,
          interests: ['technology', 'sailing', 'travel', 'cooking', 'wine tasting'],
          isVisible: true,
        },
      },
      veteranDetails: {
        create: {
          branch: MilitaryBranch.NAVY,
          rank: 'Petty Officer First Class (E-6)',
          mos: 'IT - Information Systems Technician',
          dutyStations: ['Naval Station Norfolk', 'USS Ronald Reagan'],
          deployments: ['Western Pacific 2012', 'Western Pacific 2014'],
          servicePeriods: {
            create: [
              {
                branch: MilitaryBranch.NAVY,
                startDate: new Date('2008-09-01'),
                endDate: new Date('2016-09-01'),
                unit: 'USS Ronald Reagan',
                dutyStation: 'Naval Station Norfolk',
              },
            ],
          },
        },
      },
    },
  });
  console.log('✅ Veteran:', sarah.email);

  // Marcus - Marine veteran (Brothers in Arms match with John)
  const marcus = await prisma.user.upsert({
    where: { email: 'marcus.williams@example.com' },
    update: { emailVerified: true, status: UserStatus.ACTIVE, role: UserRole.VETERAN_VERIFIED },
    create: {
      email: 'marcus.williams@example.com',
      passwordHash: defaultPassword,
      role: UserRole.VETERAN_VERIFIED,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      profile: {
        create: {
          displayName: 'Marcus W.',
          bio: 'Former Marine, now a fitness instructor. Helping fellow vets stay in shape.',
          gender: Gender.MALE,
          dateOfBirth: new Date('1986-11-30'),
          location: 'Los Angeles, CA',
          latitude: 34.0522,
          longitude: -118.2437,
          interests: ['fitness', 'MMA', 'veteran advocacy', 'surfing'],
          isVisible: true,
        },
      },
      veteranDetails: {
        create: {
          branch: MilitaryBranch.MARINE_CORPS,
          rank: 'Sergeant (E-5)',
          mos: '0311 - Rifleman',
          dutyStations: ['Camp Pendleton, CA', 'Camp Lejeune, NC'],
          deployments: ['Iraq 2008', 'Afghanistan 2010-2011'],
          servicePeriods: {
            create: [
              {
                branch: MilitaryBranch.MARINE_CORPS,
                startDate: new Date('2006-03-01'),
                endDate: new Date('2014-03-01'),
                unit: '1st Marine Division',
                dutyStation: 'Camp Pendleton, CA',
              },
            ],
          },
        },
      },
    },
  });
  console.log('✅ Veteran:', marcus.email);

  // Lisa - Air Force veteran
  const lisa = await prisma.user.upsert({
    where: { email: 'lisa.chen@example.com' },
    update: { emailVerified: true, status: UserStatus.ACTIVE, role: UserRole.VETERAN_VERIFIED },
    create: {
      email: 'lisa.chen@example.com',
      passwordHash: defaultPassword,
      role: UserRole.VETERAN_VERIFIED,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      profile: {
        create: {
          displayName: 'Lisa C.',
          bio: 'Air Force veteran, former drone pilot. Now pursuing my MBA.',
          gender: Gender.FEMALE,
          dateOfBirth: new Date('1990-02-14'),
          location: 'Phoenix, AZ',
          latitude: 33.4484,
          longitude: -112.0740,
          interests: ['aviation', 'business', 'hiking', 'photography', 'dogs'],
          isVisible: true,
        },
      },
      veteranDetails: {
        create: {
          branch: MilitaryBranch.AIR_FORCE,
          rank: 'Captain (O-3)',
          mos: '18X - Remotely Piloted Aircraft Pilot',
          dutyStations: ['Creech AFB, NV', 'Davis-Monthan AFB, AZ'],
          deployments: ['Remote operations worldwide'],
          servicePeriods: {
            create: [
              {
                branch: MilitaryBranch.AIR_FORCE,
                startDate: new Date('2012-05-01'),
                endDate: new Date('2020-05-01'),
                unit: '432nd Wing',
                dutyStation: 'Creech AFB, NV',
              },
            ],
          },
        },
      },
    },
  });
  console.log('✅ Veteran:', lisa.email);

  // David - Coast Guard veteran
  const david = await prisma.user.upsert({
    where: { email: 'david.torres@example.com' },
    update: { emailVerified: true, status: UserStatus.ACTIVE, role: UserRole.VETERAN_VERIFIED },
    create: {
      email: 'david.torres@example.com',
      passwordHash: defaultPassword,
      role: UserRole.VETERAN_VERIFIED,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      profile: {
        create: {
          displayName: 'David T.',
          bio: 'Coast Guard veteran, rescued souls and now rescuing dogs!',
          gender: Gender.MALE,
          dateOfBirth: new Date('1983-08-05'),
          location: 'Seattle, WA',
          latitude: 47.6062,
          longitude: -122.3321,
          interests: ['dogs', 'boating', 'search and rescue', 'woodworking'],
          isVisible: true,
        },
      },
      veteranDetails: {
        create: {
          branch: MilitaryBranch.COAST_GUARD,
          rank: 'Chief Petty Officer (E-7)',
          mos: 'BM - Boatswains Mate',
          dutyStations: ['Station Seattle', 'Station San Francisco'],
          deployments: ['Pacific Operations'],
          servicePeriods: {
            create: [
              {
                branch: MilitaryBranch.COAST_GUARD,
                startDate: new Date('2003-07-01'),
                endDate: new Date('2019-07-01'),
                unit: 'Station Seattle',
                dutyStation: 'Seattle, WA',
              },
            ],
          },
        },
      },
    },
  });
  console.log('✅ Veteran:', david.email);

  // ============ UNVERIFIED VETERANS ============
  
  const mike = await prisma.user.upsert({
    where: { email: 'mike.johnson@example.com' },
    update: { emailVerified: true, status: UserStatus.ACTIVE, role: UserRole.VETERAN_UNVERIFIED },
    create: {
      email: 'mike.johnson@example.com',
      passwordHash: defaultPassword,
      role: UserRole.VETERAN_UNVERIFIED,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      profile: {
        create: {
          displayName: 'Mike J.',
          bio: 'Marine Corps veteran, 4 years infantry. Just submitted my verification!',
          gender: Gender.MALE,
          dateOfBirth: new Date('1992-11-08'),
          location: 'Austin, TX',
          latitude: 30.2672,
          longitude: -97.7431,
          interests: ['fitness', 'shooting sports', 'BBQ', 'country music'],
          isVisible: true,
        },
      },
      veteranDetails: {
        create: {
          branch: MilitaryBranch.MARINE_CORPS,
          rank: 'Corporal (E-4)',
          mos: '0311 - Rifleman',
          dutyStations: ['Camp Lejeune, NC'],
          deployments: ['Afghanistan 2018'],
          servicePeriods: {
            create: [
              {
                branch: MilitaryBranch.MARINE_CORPS,
                startDate: new Date('2016-01-15'),
                endDate: new Date('2020-01-15'),
                unit: '2nd Battalion, 8th Marines',
                dutyStation: 'Camp Lejeune, NC',
              },
            ],
          },
        },
      },
    },
  });
  console.log('✅ Unverified Veteran:', mike.email);

  const rachel = await prisma.user.upsert({
    where: { email: 'rachel.kim@example.com' },
    update: { emailVerified: true, status: UserStatus.ACTIVE, role: UserRole.VETERAN_UNVERIFIED },
    create: {
      email: 'rachel.kim@example.com',
      passwordHash: defaultPassword,
      role: UserRole.VETERAN_UNVERIFIED,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      profile: {
        create: {
          displayName: 'Rachel K.',
          bio: 'Army National Guard, just finished my service. Working on getting verified!',
          gender: Gender.FEMALE,
          dateOfBirth: new Date('1994-05-20'),
          location: 'Portland, OR',
          latitude: 45.5152,
          longitude: -122.6784,
          interests: ['art', 'music', 'hiking', 'coffee'],
          isVisible: true,
        },
      },
      veteranDetails: {
        create: {
          branch: MilitaryBranch.ARMY,
          rank: 'Specialist (E-4)',
          mos: '68W - Combat Medic',
          dutyStations: ['Various'],
          deployments: [],
          servicePeriods: {
            create: [
              {
                branch: MilitaryBranch.ARMY,
                startDate: new Date('2018-06-01'),
                endDate: new Date('2024-06-01'),
                unit: 'Oregon National Guard',
                dutyStation: 'Portland, OR',
              },
            ],
          },
        },
      },
    },
  });
  console.log('✅ Unverified Veteran:', rachel.email);

  // ============ UNVERIFIED VETERAN USERS ============
  
  const emily = await prisma.user.upsert({
    where: { email: 'emily.davies@example.com' },
    update: { emailVerified: true, status: UserStatus.ACTIVE, role: UserRole.VETERAN_UNVERIFIED },
    create: {
      email: 'emily.davies@example.com',
      passwordHash: defaultPassword,
      role: UserRole.VETERAN_UNVERIFIED,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      profile: {
        create: {
          displayName: 'Emily D.',
          bio: 'Ex-Royal Signals, 2008-2014. Based in Leeds now. Looking to reconnect with former colleagues.',
          location: 'Leeds, UK',
          isVisible: true,
        },
      },
      veteranDetails: {
        create: {
          branch: 'BRITISH_ARMY',
          rank: 'Corporal',
          dutyStations: ['Blandford Camp'],
          deployments: ['Afghanistan (2012)'],
        },
      },
    },
  });
  console.log('✅ Unverified Veteran:', emily.email);

  const james = await prisma.user.upsert({
    where: { email: 'james.taylor@example.com' },
    update: { emailVerified: true, status: UserStatus.ACTIVE, role: UserRole.VETERAN_UNVERIFIED },
    create: {
      email: 'james.taylor@example.com',
      passwordHash: defaultPassword,
      role: UserRole.VETERAN_UNVERIFIED,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      profile: {
        create: {
          displayName: 'James T.',
          bio: 'Royal Marines, 2005-2013. Two tours of Helmand. Now in Bristol, working in security.',
          location: 'Bristol, UK',
          isVisible: true,
        },
      },
      veteranDetails: {
        create: {
          branch: 'ROYAL_MARINES',
          rank: 'Sergeant',
          dutyStations: ['Norton Manor Camp'],
          deployments: ['Afghanistan (2008)', 'Afghanistan (2011)'],
        },
      },
    },
  });
  console.log('✅ Unverified Veteran:', james.email);

  // ============ PROBLEM USERS ============
  
  const suspended = await prisma.user.upsert({
    where: { email: 'suspended.user@example.com' },
    update: { emailVerified: true, status: UserStatus.SUSPENDED, role: UserRole.VETERAN_UNVERIFIED },
    create: {
      email: 'suspended.user@example.com',
      passwordHash: defaultPassword,
      role: UserRole.VETERAN_UNVERIFIED,
      status: UserStatus.SUSPENDED,
      emailVerified: true,
      profile: {
        create: {
          displayName: 'Suspended User',
          bio: 'This account has been suspended.',
          location: 'Unknown',
          isVisible: false,
        },
      },
    },
  });
  console.log('✅ Suspended User:', suspended.email);

  const banned = await prisma.user.upsert({
    where: { email: 'banned.user@example.com' },
    update: { emailVerified: true, status: UserStatus.BANNED, role: UserRole.VETERAN_UNVERIFIED },
    create: {
      email: 'banned.user@example.com',
      passwordHash: defaultPassword,
      role: UserRole.VETERAN_UNVERIFIED,
      status: UserStatus.BANNED,
      emailVerified: true,
      profile: {
        create: {
          displayName: 'Banned User',
          bio: 'This account has been permanently banned.',
          location: 'Unknown',
          isVisible: false,
        },
      },
    },
  });
  console.log('✅ Banned User:', banned.email);

  console.log('');
  console.log('💳 Creating subscriptions with different tiers...');

  // ============ SUBSCRIPTIONS ============
  const subscriptions = [
    { userId: admin.id, tier: 'BIA_PLUS' },
    { userId: moderator.id, tier: 'BIA_PLUS' },
    { userId: john.id, tier: 'BIA_PLUS' },
    { userId: sarah.id, tier: 'BIA_PLUS' },
    { userId: marcus.id, tier: 'BIA_BASIC' },
    { userId: lisa.id, tier: 'BIA_BASIC' },
    { userId: david.id, tier: 'BIA_BASIC' },
    { userId: mike.id, tier: 'FREE' },
    { userId: rachel.id, tier: 'FREE' },
    { userId: emily.id, tier: 'FREE' },
    { userId: james.id, tier: 'FREE' },
    { userId: suspended.id, tier: 'FREE' },
    { userId: banned.id, tier: 'FREE' },
  ];

  for (const sub of subscriptions) {
    await (prisma as any).membership.upsert({
      where: { userId: sub.userId },
      update: { tier: sub.tier as any, status: 'ACTIVE' },
      create: {
        userId: sub.userId,
        tier: sub.tier as any,
        status: 'ACTIVE',
      },
    });
  }
  console.log('✅ 13 subscriptions created with various tiers');
  console.log('   • john.doe: BIA_PLUS');
  console.log('   • sarah.smith: BIA_PLUS');
  console.log('   • marcus.williams: BIA_BASIC');
  console.log('   • lisa.chen: BIA_BASIC');
  console.log('   • david.torres: BIA_BASIC');
  console.log('   • emily.wilson: FREE');
  console.log('   • admin & moderator: BIA_PLUS');

  console.log('');
  console.log('📋 Creating verification requests...');

  // Verification requests
  await prisma.verificationRequest.createMany({
    data: [
      {
        userId: mike.id,
        status: 'PENDING',
        evidenceUrls: ['uploads/verification/mike_dd214.pdf'],
        notes: 'Submitted DD-214, clear and legible',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        userId: rachel.id,
        status: 'PENDING',
        evidenceUrls: ['uploads/verification/rachel_dd214.pdf', 'uploads/verification/rachel_orders.pdf'],
        notes: 'Submitted DD-214 and deployment orders',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    ],
    skipDuplicates: true,
  });
  console.log('✅ 2 pending verification requests created');

  console.log('');
  console.log('🤝 Creating Brothers in Arms matches...');

  // ============ BROTHERS IN ARMS MATCHES ============
  const match1 = await (prisma as any).connection.upsert({
    where: {
      user1Id_user2Id_connectionType: {
        user1Id: john.id,
        user2Id: sarah.id,
        connectionType: ConnectionType.BROTHERS_IN_ARMS,
      },
    },
    update: { status: ConnectionStatus.ACTIVE },
    create: {
      user1Id: john.id,
      user2Id: sarah.id,
      connectionType: ConnectionType.BROTHERS_IN_ARMS,
      status: ConnectionStatus.ACTIVE,
    },
  });
  console.log('✅ Match: John + Sarah (Brothers in Arms)');

  const match2 = await (prisma as any).connection.upsert({
    where: {
      user1Id_user2Id_connectionType: {
        user1Id: john.id,
        user2Id: lisa.id,
        connectionType: ConnectionType.BROTHERS_IN_ARMS,
      },
    },
    update: { status: ConnectionStatus.ACTIVE },
    create: {
      user1Id: john.id,
      user2Id: lisa.id,
      connectionType: ConnectionType.BROTHERS_IN_ARMS,
      status: ConnectionStatus.ACTIVE,
    },
  });
  console.log('✅ Match: John + Lisa (Brothers in Arms)');

  const match3 = await (prisma as any).connection.upsert({
    where: {
      user1Id_user2Id_connectionType: {
        user1Id: david.id,
        user2Id: emily.id,
        connectionType: ConnectionType.BROTHERS_IN_ARMS,
      },
    },
    update: { status: ConnectionStatus.ACTIVE },
    create: {
      user1Id: david.id,
      user2Id: emily.id,
      connectionType: ConnectionType.BROTHERS_IN_ARMS,
      status: ConnectionStatus.ACTIVE,
    },
  });
  console.log('✅ Match: David + Emily (Brothers in Arms)');

  const match4 = await (prisma as any).connection.upsert({
    where: {
      user1Id_user2Id_connectionType: {
        user1Id: john.id,
        user2Id: marcus.id,
        connectionType: ConnectionType.BROTHERS_IN_ARMS,
      },
    },
    update: { status: ConnectionStatus.ACTIVE },
    create: {
      user1Id: john.id,
      user2Id: marcus.id,
      connectionType: ConnectionType.BROTHERS_IN_ARMS,
      status: ConnectionStatus.ACTIVE,
    },
  });
  console.log('✅ Match: John + Marcus (Brothers in Arms)');

  console.log('');
  console.log('💬 Creating message conversations...');

  // ============ MESSAGES ============
  // Using relation connect syntax for proper Prisma types
  await prisma.message.deleteMany({
    where: {
      connectionId: {
        in: [match1.id, match3.id, match4.id],
      },
    },
  });
  console.log('âœ… Cleared existing seeded messages for active demo conversations');

  // Conversation between John and Sarah
  const johnSarahMessages = [
    { senderId: john.id, receiverId: sarah.id, content: "Hey Sarah! I noticed you served on the Reagan. My buddy was stationed at Norfolk around the same time.", minutesAgo: 1440 },
    { senderId: sarah.id, receiverId: john.id, content: "Oh nice! Small world. What branch were you in?", minutesAgo: 1420 },
    { senderId: john.id, receiverId: sarah.id, content: "Army, 82nd Airborne. Spent some time at Camp Pendleton for joint exercises.", minutesAgo: 1380 },
    { senderId: sarah.id, receiverId: john.id, content: "I love San Diego! How long have you been out?", minutesAgo: 1200 },
    { senderId: john.id, receiverId: sarah.id, content: "About 9 years now. Still adjusting sometimes, but it gets easier. You?", minutesAgo: 1080 },
    { senderId: sarah.id, receiverId: john.id, content: "Similar story - 8 years. The transition was tough but I found my footing in tech.", minutesAgo: 960 },
    { senderId: john.id, receiverId: sarah.id, content: "That's great! I'm in construction management now. Leadership skills transfer well.", minutesAgo: 720 },
    { senderId: sarah.id, receiverId: john.id, content: "Maybe we could grab coffee if you're ever in Virginia Beach?", minutesAgo: 480 },
    { senderId: john.id, receiverId: sarah.id, content: "I'd like that! I'm planning a trip to DC next month.", minutesAgo: 240 },
    { senderId: sarah.id, receiverId: john.id, content: "Perfect! Let me know your dates and we can work something out!", minutesAgo: 120 },
    { senderId: john.id, receiverId: sarah.id, content: "Will do! Looking forward to it. Have a great day!", minutesAgo: 60 },
    { senderId: sarah.id, receiverId: john.id, content: "You too, John! Talk soon!", minutesAgo: 30 },
  ];

  for (const msg of johnSarahMessages) {
    const encrypted = encryptMessage(msg.content);
    await prisma.message.create({
      data: {
        connection: { connect: { id: match1.id } },
        sender: { connect: { id: msg.senderId } },
        receiver: { connect: { id: msg.receiverId } },
        encryptedContent: encrypted.encryptedContent,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        createdAt: new Date(Date.now() - msg.minutesAgo * 60 * 1000),
        readAt: new Date(),
      },
    });
  }
  console.log('✅ 12 messages: John + Sarah conversation');
  await prisma.connection.update({ where: { id: match1.id }, data: { lastMessageAt: new Date(Date.now() - 1 * 60 * 1000) } });

  // Conversation between John and Marcus (Brothers)
  const johnMarcusMessages = [
    { senderId: marcus.id, receiverId: john.id, content: "Hey brother! Looks like we might have crossed paths at Pendleton?", minutesAgo: 4320 },
    { senderId: john.id, receiverId: marcus.id, content: "Marcus! Yeah I was there for joint training in 2012. You were with 1st MarDiv?", minutesAgo: 4200 },
    { senderId: marcus.id, receiverId: john.id, content: "That's right! I remember some 82nd guys coming through. Small world.", minutesAgo: 4080 },
    { senderId: john.id, receiverId: marcus.id, content: "Crazy how the military world is so small. What are you up to these days?", minutesAgo: 3960 },
    { senderId: marcus.id, receiverId: john.id, content: "Running a fitness program for vets in LA. You should come check it out!", minutesAgo: 3840 },
    { senderId: john.id, receiverId: marcus.id, content: "I'm in San Diego so not too far. Would definitely be down to visit.", minutesAgo: 2880 },
    { senderId: marcus.id, receiverId: john.id, content: "Awesome! We do a monthly veteran meetup too - good for networking.", minutesAgo: 1440 },
    { senderId: john.id, receiverId: marcus.id, content: "Sounds great. Thanks for reaching out, man. Good to connect.", minutesAgo: 720 },
  ];

  for (const msg of johnMarcusMessages) {
    const encrypted = encryptMessage(msg.content);
    await prisma.message.create({
      data: {
        connection: { connect: { id: match4.id } },
        sender: { connect: { id: msg.senderId } },
        receiver: { connect: { id: msg.receiverId } },
        encryptedContent: encrypted.encryptedContent,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        createdAt: new Date(Date.now() - msg.minutesAgo * 60 * 1000),
        readAt: new Date(),
      },
    });
  }
  console.log('✅ 8 messages: John + Marcus conversation (Brothers)');
  await prisma.connection.update({ where: { id: match4.id }, data: { lastMessageAt: new Date(Date.now() - 720 * 60 * 1000) } });

  // Conversation between David and Emily
  const davidEmilyMessages = [
    { senderId: david.id, receiverId: emily.id, content: "Hi Emily! I saw you're involved in education. I work with a vet dog training program.", minutesAgo: 2880 },
    { senderId: emily.id, receiverId: david.id, content: "That sounds amazing! My dad was Army, I've always wanted to help veterans.", minutesAgo: 2760 },
    { senderId: david.id, receiverId: emily.id, content: "That's cool that you have that connection. What does he think about this app?", minutesAgo: 2640 },
    { senderId: emily.id, receiverId: david.id, content: "Haha he actually suggested it! Said I'd understand military life.", minutesAgo: 2400 },
    { senderId: david.id, receiverId: emily.id, content: "Smart man. So you grew up on bases? Which ones?", minutesAgo: 2160 },
    { senderId: emily.id, receiverId: david.id, content: "Fort Carson, then Fort Lewis. Moved to Denver for college and stayed.", minutesAgo: 1920 },
  ];

  for (const msg of davidEmilyMessages) {
    const encrypted = encryptMessage(msg.content);
    await prisma.message.create({
      data: {
        connection: { connect: { id: match3.id } },
        sender: { connect: { id: msg.senderId } },
        receiver: { connect: { id: msg.receiverId } },
        encryptedContent: encrypted.encryptedContent,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        createdAt: new Date(Date.now() - msg.minutesAgo * 60 * 1000),
        readAt: new Date(),
      },
    });
  }
  console.log('✅ 6 messages: David + Emily conversation');
  await prisma.connection.update({ where: { id: match3.id }, data: { lastMessageAt: new Date(Date.now() - 1920 * 60 * 1000) } });

  console.log('');
  console.log('🚨 Creating reports for moderation testing...');

  // ============ REPORTS ============
  await prisma.report.createMany({
    data: [
      {
        reporterId: sarah.id,
        reportedUserId: suspended.id,
        reason: ReportReason.HARASSMENT,
        description: 'User sent multiple unwanted messages after being asked to stop.',
        status: ReportStatus.ACTION_TAKEN,
        resolution: 'User account suspended for 30 days.',
        resolverId: moderator.id,
        resolvedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
      {
        reporterId: emily.id,
        reportedUserId: banned.id,
        reason: ReportReason.SCAM,
        description: 'User attempted to solicit money claiming to be a veteran in need.',
        status: ReportStatus.ACTION_TAKEN,
        resolution: 'User permanently banned for fraud.',
        resolverId: admin.id,
        resolvedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
      },
      {
        reporterId: lisa.id,
        reportedUserId: james.id,
        reason: ReportReason.INAPPROPRIATE_CONTENT,
        description: 'Profile contains inappropriate content in bio.',
        status: ReportStatus.PENDING,
      },
      {
        reporterId: marcus.id,
        reportedUserId: james.id,
        reason: ReportReason.FAKE_PROFILE,
        description: 'Suspect this profile may not be genuine.',
        status: ReportStatus.PENDING,
      },
    ],
    skipDuplicates: true,
  });
  console.log('✅ 4 reports created (2 resolved, 2 pending)');

  // ============ BLOCKS ============
  await prisma.block.createMany({
    data: [
      { blockerId: sarah.id, blockedId: suspended.id, reason: 'Harassment' },
      { blockerId: emily.id, blockedId: banned.id, reason: 'Attempted scam' },
    ],
    skipDuplicates: true,
  });
  console.log('✅ 2 blocks created');

  // ============ AUDIT LOGS ============
  await prisma.auditLog.createMany({
    data: [
      {
        userId: admin.id,
        action: 'USER_BANNED',
        resource: 'user',
        resourceId: banned.id,
        metadata: { reason: 'Fraud and scam attempts', previousStatus: 'ACTIVE' },
        ipAddress: '192.168.1.1',
      },
      {
        userId: moderator.id,
        action: 'USER_SUSPENDED',
        resource: 'user',
        resourceId: suspended.id,
        metadata: { reason: 'Harassment', duration: '30 days', previousStatus: 'ACTIVE' },
        ipAddress: '192.168.1.2',
      },
      {
        userId: moderator.id,
        action: 'REPORT_RESOLVED',
        resource: 'report',
        resourceId: '1',
        metadata: { resolution: 'User suspended' },
        ipAddress: '192.168.1.2',
      },
      {
        userId: admin.id,
        action: 'VERIFICATION_APPROVED',
        resource: 'verification',
        resourceId: sarah.id,
        metadata: { branch: 'NAVY', approvedDocuments: ['DD-214'] },
        ipAddress: '192.168.1.1',
      },
    ],
    skipDuplicates: true,
  });
  console.log('✅ 4 audit logs created');

  // ============ REGIMENT FORUMS ============
  console.log('');
  console.log('🪖 Seeding forum categories...');

  for (const category of STANDARD_FORUM_CATEGORIES) {
    await (prisma as any).forumCategory.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
        icon: category.icon,
        tier: category.tier,
        sortOrder: category.sortOrder,
        isActive: true,
        regiment: null,
      },
      create: {
        slug: category.slug,
        name: category.name,
        description: category.description,
        icon: category.icon,
        tier: category.tier,
        sortOrder: category.sortOrder,
        isActive: true,
      },
    });
  }
  console.log(`✅ ${STANDARD_FORUM_CATEGORIES.length} standard forum categories ready`);

  let regimentCategoriesCreated = 0;
  for (const regiment of UK_REGIMENTS) {
    for (let i = 0; i < REGIMENT_FORUM_TEMPLATES.length; i++) {
      const tpl = REGIMENT_FORUM_TEMPLATES[i];
      await (prisma as any).forumCategory.upsert({
        where: { slug: `${regiment.slug}-${tpl.suffix}` },
        update: {
          name: tpl.name,
          description: tpl.description(regiment.name),
          icon: tpl.icon,
          tier: 'REGIMENT',
          regiment: regiment.slug,
          sortOrder: i,
          isActive: true,
        },
        create: {
          slug: `${regiment.slug}-${tpl.suffix}`,
          name: tpl.name,
          description: tpl.description(regiment.name),
          icon: tpl.icon,
          tier: 'REGIMENT',
          regiment: regiment.slug,
          sortOrder: i,
          isActive: true,
        },
      });
      regimentCategoriesCreated++;
    }
  }
  console.log(`✅ ${regimentCategoriesCreated} regiment forum categories created (${UK_REGIMENTS.length} regiments × 5 forums)`);

  console.log('');
  console.log('🧵 Seeding starter forum threads from Admin...');

  const forumCategories = await (prisma as any).forumCategory.findMany({
    where: { isActive: true },
    select: {
      id: true,
      slug: true,
      name: true,
      tier: true,
      regiment: true,
    },
    orderBy: [
      { tier: 'asc' },
      { sortOrder: 'asc' },
      { name: 'asc' },
    ],
  });

  let starterThreadsCreated = 0;
  for (const category of forumCategories as SeedForumCategory[]) {
    const starterThreads = getForumThreadsForCategory(category);
    for (const starterThread of starterThreads) {
      const created = await ensureForumThread(category.id, admin.id, starterThread);
      if (created) starterThreadsCreated++;
    }
  }
  console.log(`✅ ${starterThreadsCreated} Admin starter threads created across ${forumCategories.length} forums`);

  // ============ ASSIGN REGIMENTS TO EXISTING USERS ============
  console.log('');
  console.log('🎖️  Assigning regiments to seed users...');

  const regimentAssignments = [
    { userId: john.id,      regiment: '1-para' },          // Army, Infantryman
    { userId: sarah.id,     regiment: 'royal-artillery' },  // Army Sergeant
    { userId: marcus.id,    regiment: '45-commando' },      // Marines
    { userId: lisa.id,      regiment: 'royal-signals' },    // Corps/Signals
    { userId: david.id,     regiment: 'royal-engineers' },  // Corps/Engineers
    { userId: admin.id,     regiment: '22-sas' },           // Admin placeholder
    { userId: moderator.id, regiment: 'intelligence-corps' },
  ];

  for (const { userId, regiment } of regimentAssignments) {
    await (prisma as any).veteranDetails.upsert({
      where: { userId },
      update: { regiment },
      create: { userId, regiment },
    });
  }
  console.log(`✅ Regiments assigned to ${regimentAssignments.length} users`);
  console.log('   • john.doe          → 1 PARA');
  console.log('   • sarah.smith       → Royal Artillery');
  console.log('   • marcus.williams   → 45 Commando');
  console.log('   • lisa.chen         → Royal Corps of Signals');
  console.log('   • david.torres      → Royal Engineers');

  console.log('');
  console.log('📰 Seeding scheduled blog posts...');
  await seedBlogPosts(prisma, admin.id);

  // ============ SUMMARY ============
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🎉 SEEDING COMPLETED SUCCESSFULLY!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('📊 Summary:');
  console.log('   • 12 users total');
  console.log('   • 4 active matches (all Brothers in Arms)');
  console.log('   • 26 messages across 3 conversations');
  console.log('   • 2 pending verification requests');
  console.log('   • 4 reports (2 pending for review)');
  console.log('');
  console.log('🔐 Test Accounts (all passwords: Password123!)');
  console.log('───────────────────────────────────────────────────────────');
  console.log('');
  console.log('👑 ADMIN & STAFF:');
  console.log('   admin@veteranfinder.com      / Admin123!@#');
  console.log('   moderator@veteranfinder.com  / Moderator123!@#');
  console.log('');
  console.log('✅ VERIFIED VETERANS:');
  console.log('   john.doe@example.com         (Army, Brothers matches + messages)');
  console.log('   sarah.smith@example.com      (Navy, Brothers match with John)');
  console.log('   marcus.williams@example.com  (Marines, Brothers match with John)');
  console.log('   lisa.chen@example.com        (Air Force, Brothers match with John)');
  console.log('   david.torres@example.com     (Coast Guard, Brothers match with Emily)');
  console.log('');
  console.log('⏳ UNVERIFIED VETERANS:');
  console.log('   mike.johnson@example.com     (pending verification)');
  console.log('   rachel.kim@example.com       (pending verification)');
  console.log('');
  console.log('👤 CIVILIANS:');
  console.log('   emily.wilson@example.com     (matched with David)');
  console.log('   james.brown@example.com      (has pending reports)');
  console.log('');
  console.log('🚫 PROBLEM USERS:');
  console.log('   suspended.user@example.com   (SUSPENDED status)');
  console.log('   banned.user@example.com      (BANNED status)');
  console.log('');
  console.log('💡 Test flow:');
  console.log('   1. Login as john.doe@example.com to test matches/messaging');
  console.log('   2. Login as admin@veteranfinder.com to test admin panel');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient, UserRole, UserStatus, Gender, MilitaryBranch, ReportReason, ReportStatus } from '@prisma/client';
import { UK_REGIMENTS } from '../src/common/constants/regiments';
import { ConnectionType, ConnectionStatus } from '../src/common/enums/connection.enum';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

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
          displayName: 'System Admin',
          bio: 'Platform administrator',
        },
      },
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
  console.log('🪖 Seeding regiment forum categories...');

  const REGIMENT_FORUM_TEMPLATES = [
    { suffix: 'general',  name: 'General Discussion',      icon: 'MessageSquare', description: (r: string) => `General chat and announcements for ${r} veterans` },
    { suffix: 'history',  name: 'History & Heritage',       icon: 'Shield',        description: (r: string) => `${r} history, traditions, battle honours and proud moments` },
    { suffix: 'reunions', name: 'Reunions & Events',        icon: 'Users',         description: (r: string) => `Upcoming ${r} reunions, regimental dinners and veteran meetups` },
    { suffix: 'support',  name: 'Veterans Support',         icon: 'Heart',         description: (r: string) => `Mental health resources, transition advice and mutual support for ${r} veterans` },
    { suffix: 'ops',      name: 'Operations & Deployments', icon: 'Rocket',        description: (r: string) => `Stories, memories and discussions from ${r} operations and tours of duty` },
  ];

  let regimentCategoriesCreated = 0;
  for (const regiment of UK_REGIMENTS) {
    for (let i = 0; i < REGIMENT_FORUM_TEMPLATES.length; i++) {
      const tpl = REGIMENT_FORUM_TEMPLATES[i];
      await (prisma as any).forumCategory.upsert({
        where: { slug: `${regiment.slug}-${tpl.suffix}` },
        update: {},
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

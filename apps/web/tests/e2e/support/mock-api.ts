import type { Page, Route } from '@playwright/test';

type MockUser = {
  id: string;
  email: string;
  role: string;
  status: string;
  emailVerified: boolean;
  profile?: {
    displayName?: string;
    profileImageUrl?: string;
    location?: string;
  };
  veteranDetails?: {
    branch?: string;
    rank?: string;
  };
};

function wrapData(data: unknown) {
  return {
    data,
    timestamp: new Date().toISOString(),
  };
}

async function json(route: Route, payload: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(payload),
  });
}

export const memberUser: MockUser = {
  id: 'user-member',
  email: 'member@example.com',
  role: 'VETERAN_MEMBER',
  status: 'ACTIVE',
  emailVerified: true,
  profile: {
    displayName: 'Alex Morgan',
    location: 'Manchester',
  },
  veteranDetails: {
    branch: 'BRITISH_ARMY',
    rank: 'Sergeant',
  },
};

export const unverifiedUser: MockUser = {
  id: 'user-unverified',
  email: 'new.user@example.com',
  role: 'VETERAN_UNVERIFIED',
  status: 'ACTIVE',
  emailVerified: true,
  profile: {
    displayName: 'Taylor Reed',
  },
  veteranDetails: {
    branch: 'BRITISH_ARMY',
    rank: 'Corporal',
  },
};

export const incompleteUser: MockUser = {
  id: 'user-incomplete',
  email: 'incomplete@example.com',
  role: 'VETERAN_UNVERIFIED',
  status: 'ACTIVE',
  emailVerified: true,
  profile: {
    displayName: '',
  },
};

export async function seedAuthState(page: Page, user: MockUser) {
  await page.addInitScript((value) => {
    window.localStorage.setItem(
      'vf_cookie_consent',
      JSON.stringify({
        necessary: true,
        functional: true,
        analytics: false,
        marketing: false,
      }),
    );

    window.localStorage.setItem(
      'auth-user',
      JSON.stringify({
        state: { user: value },
        version: 0,
      }),
    );
  }, user);
}

export async function seedCookieConsent(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'vf_cookie_consent',
      JSON.stringify({
        necessary: true,
        functional: true,
        analytics: false,
        marketing: false,
      }),
    );
  });
}

export async function mockCurrentUser(page: Page, user: MockUser) {
  await page.route('**/api/auth/me', (route) => json(route, wrapData(user)));
}

export async function mockUnauthorizedCurrentUser(page: Page) {
  await page.route('**/api/auth/me', (route) =>
    json(route, { message: 'Unauthorized' }, 401),
  );
}

export async function mockBrothersDashboard(page: Page) {
  await page.route('**/api/brothers/search', (route) =>
    json(route, wrapData([
      {
        id: 'candidate-1',
        displayName: 'Chris Turner',
        overlapScore: 0.84,
        overlapReasons: ['Served in the same regiment during overlapping years'],
        veteranInfo: {
          isVerified: true,
          branch: 'BRITISH_ARMY',
          rank: 'Colour Sergeant',
        },
      },
    ])),
  );

  await page.route('**/api/brothers/requests', (route) =>
    json(route, wrapData({ requests: [] })),
  );
}

export async function mockVerificationStatus(page: Page, statusPayload: unknown = []) {
  await page.route('**/api/verification/status', (route) =>
    json(route, wrapData(statusPayload)),
  );
}

export async function mockUnreadCounts(page: Page, total = 0) {
  await page.route('**/api/messaging/unread', (route) =>
    json(route, wrapData({ total })),
  );
}

export async function mockSubscription(page: Page, tier: 'FREE' | 'BIA' | 'BIA_PLUS' = 'FREE') {
  await page.route('**/api/subscriptions/me', (route) =>
    json(route, wrapData({ tier })),
  );
}

export async function mockForumIndex(page: Page) {
  await page.route('**/api/bia/forums', (route) =>
    json(route, wrapData({
      categories: [
        {
          id: 'forum-history',
          slug: 'history-and-reunions',
          name: 'History and Reunions',
          description: 'Reconnect around shared deployments, old oppos, and reunion planning.',
          icon: 'Shield',
          tier: 'BIA',
          threadCount: 8,
          latestThread: {
            title: 'Who is attending the autumn reunion in York?',
            lastPostAt: '2026-03-14T10:00:00.000Z',
            author: {
              profile: {
                displayName: 'Admin',
              },
            },
          },
        },
      ],
    })),
  );
}

export async function mockForumThreads(page: Page) {
  await page.route('**/api/bia/forums/history-and-reunions/threads*', (route) =>
    json(route, wrapData({
      category: {
        slug: 'history-and-reunions',
        name: 'History and Reunions',
        description: 'Reconnect around shared deployments, old oppos, and reunion planning.',
        tier: 'BIA',
      },
      threads: [
        {
          id: 'thread-1',
          title: 'Planning the next reunion for former signals platoon',
          isPinned: true,
          isLocked: false,
          viewCount: 112,
          lastPostAt: '2026-03-14T11:00:00.000Z',
          author: {
            profile: {
              displayName: 'Admin',
            },
          },
          _count: {
            posts: 4,
          },
        },
      ],
    })),
  );
}

export async function mockThreadView(page: Page) {
  await page.route('**/api/bia/threads/thread-1*', (route) =>
    json(route, wrapData({
      thread: {
        id: 'thread-1',
        title: 'Planning the next reunion for former signals platoon',
        isPinned: true,
        isLocked: false,
        viewCount: 112,
        authorId: 'admin-id',
        author: {
          profile: {
            displayName: 'Admin',
          },
        },
        category: {
          slug: 'history-and-reunions',
          name: 'History and Reunions',
          tier: 'BIA',
        },
      },
      posts: [
        {
          id: 'post-1',
          authorId: 'admin-id',
          createdAt: '2026-03-14T09:00:00.000Z',
          content: 'Let us pull together likely dates, locations, and headcount so we can make the next reunion easier to commit to.',
          author: {
            role: 'ADMIN',
            profile: {
              displayName: 'Admin',
            },
            veteranDetails: {
              branch: 'BRITISH_ARMY',
              rank: 'Captain',
            },
          },
        },
      ],
      total: 1,
    })),
  );
}

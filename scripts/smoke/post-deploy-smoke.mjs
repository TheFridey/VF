const baseUrl = process.env.SMOKE_BASE_URL;

if (!baseUrl) {
  throw new Error('SMOKE_BASE_URL is required for post-deploy smoke checks.');
}

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  storeFrom(response) {
    const headerBag = response.headers;
    const rawSetCookies = typeof headerBag.getSetCookie === 'function'
      ? headerBag.getSetCookie()
      : splitSetCookieHeader(headerBag.get('set-cookie'));

    for (const rawCookie of rawSetCookies) {
      const [cookiePair] = rawCookie.split(';');
      const separator = cookiePair.indexOf('=');

      if (separator === -1) {
        continue;
      }

      const name = cookiePair.slice(0, separator).trim();
      const value = cookiePair.slice(separator + 1).trim();

      if (name) {
        this.cookies.set(name, value);
      }
    }
  }

  headerValue() {
    return [...this.cookies.entries()]
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }

  get(name) {
    return this.cookies.get(name);
  }
}

function splitSetCookieHeader(headerValue) {
  if (!headerValue) {
    return [];
  }

  return headerValue.split(/,(?=\s*[^;,\s]+=)/);
}

function absolute(pathname) {
  return new URL(pathname, baseUrl).toString();
}

async function readResponseBody(response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
}

async function request(pathname, options = {}, jar) {
  const headers = new Headers(options.headers || {});

  if (jar) {
    const cookieHeader = jar.headerValue();
    if (cookieHeader) {
      headers.set('Cookie', cookieHeader);
    }
  }

  const response = await fetch(absolute(pathname), {
    redirect: options.redirect || 'follow',
    ...options,
    headers,
  });

  if (jar) {
    jar.storeFrom(response);
  }

  return response;
}

async function expectOkJson(pathname, jar) {
  const response = await request(pathname, {}, jar);

  if (!response.ok) {
    throw new Error(`${pathname} returned ${response.status}`);
  }

  return readResponseBody(response);
}

function unwrapEnvelope(payload) {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data;
  }

  return payload;
}

function logStep(message) {
  console.log(`\n[smoke] ${message}`);
}

async function runUnauthenticatedChecks() {
  logStep('Checking live public endpoints');

  const statusLive = unwrapEnvelope(await expectOkJson('/status/live'));
  const apiLive = unwrapEnvelope(await expectOkJson('/api/health/live'));
  const apiReady = unwrapEnvelope(await expectOkJson('/api/health/ready'));

  if (!statusLive || !apiLive || !apiReady) {
    throw new Error('One or more health endpoints returned an empty payload.');
  }

  logStep('Checking homepage load');
  const homepage = await request('/', { redirect: 'follow' });
  if (!homepage.ok) {
    throw new Error(`Homepage returned ${homepage.status}`);
  }

  logStep('Checking unauthenticated profile redirect');
  const profileRedirect = await request('/app/profile', { redirect: 'manual' });
  const location = profileRedirect.headers.get('location') || '';
  const isRedirect = profileRedirect.status >= 300 && profileRedirect.status < 400;

  if (!isRedirect || !location.includes('/auth/login')) {
    throw new Error(`Expected /app/profile to redirect to /auth/login, received ${profileRedirect.status} -> ${location || 'no location header'}`);
  }
}

async function runAuthenticatedChecks() {
  const email = process.env.SMOKE_EMAIL;
  const password = process.env.SMOKE_PASSWORD;

  if (!email || !password) {
    logStep('Skipping authenticated smoke checks because SMOKE_EMAIL or SMOKE_PASSWORD is not set');
    return;
  }

  const jar = new CookieJar();

  logStep('Logging in with the smoke user');
  const loginResponse = await request(
    '/api/v1/auth/login',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ email, password }),
    },
    jar,
  );

  if (!loginResponse.ok) {
    throw new Error(`Smoke login failed with ${loginResponse.status}`);
  }

  logStep('Checking /auth/me and profile');
  const me = unwrapEnvelope(await expectOkJson('/api/v1/auth/me', jar));
  const profile = unwrapEnvelope(await expectOkJson('/api/v1/profiles/me', jar));

  if (!me?.user && !me?.id) {
    throw new Error('Smoke auth check did not return an authenticated user payload.');
  }

  const csrfToken = jar.get('csrf-token');

  if (process.env.SMOKE_PROFILE_TOUCH === 'true') {
    if (!csrfToken) {
      throw new Error('CSRF token cookie was not present for the optional profile smoke touch.');
    }

    const existingLocation = typeof profile?.location === 'string' ? profile.location : undefined;
    const existingDisplayName = typeof profile?.displayName === 'string' ? profile.displayName : undefined;
    const touchValue = process.env.SMOKE_PROFILE_TOUCH_VALUE || existingLocation || existingDisplayName;

    if (touchValue) {
      logStep('Performing optional harmless profile smoke touch');
      const patchBody = existingLocation !== undefined
        ? { location: touchValue }
        : { displayName: touchValue };

      const profileTouch = await request(
        '/api/v1/profiles/me',
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          body: JSON.stringify(patchBody),
        },
        jar,
      );

      if (!profileTouch.ok) {
        throw new Error(`Optional smoke profile touch failed with ${profileTouch.status}`);
      }
    } else {
      logStep('Skipping optional profile smoke touch because no harmless field value was available');
    }
  }

  logStep('Checking Brothers search with a real filter');
  const brothersBranch = process.env.SMOKE_BROTHERS_BRANCH || 'BRITISH_ARMY';
  const brothersResponse = await request(
    `/api/v1/brothers/search?branch=${encodeURIComponent(brothersBranch)}`,
    {
      headers: {
        Accept: 'application/json',
      },
    },
    jar,
  );

  if (!brothersResponse.ok) {
    throw new Error(`Brothers smoke search failed with ${brothersResponse.status}`);
  }

  const brothersPayload = unwrapEnvelope(await readResponseBody(brothersResponse));
  if (!Array.isArray(brothersPayload)) {
    throw new Error('Brothers smoke search did not return an array payload.');
  }
}

await runUnauthenticatedChecks();
await runAuthenticatedChecks();

console.log('\n[smoke] Post-deploy smoke checks passed.');

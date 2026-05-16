# Platform Hardening Notes

## Current direction

- `apps/admin` is the canonical admin surface.
- The `apps/web` admin routes were removed in March 2026. All admin access is via `apps/admin` on port `3002` only.
- Public homepage sections are now modular and easier to iterate on without reopening one large file.
- Frontend regression coverage exists in `apps/web` for auth, onboarding, protected routes, verification start, settings, and forums.

## Remaining follow-up

- The BIA/forums area is more structured now, but parts of the visual treatment are still more premium than calm; a second readability pass would be worthwhile.
- Frontend end-to-end coverage is mocked at the browser boundary for stability. A later pass should add one or two fully integrated flows against a seeded API environment.
- Several legacy files still contain encoding artefacts from earlier edits. They do not block execution, but they should be normalised to plain UTF-8 as part of a repo-wide cleanup.
- Admin usability improvements in the dedicated admin app are still mostly structural in this pass. Saved filters, bulk actions, and richer moderation timelines remain good next steps.

## Admin protection

- `admin.veteranfinder.co.uk` should be protected by an explicit edge or proxy gate in production, not only application auth.
- Preferred order:
  1. Network allowlisting at the reverse proxy or CDN layer for trusted office/VPN egress IPs.
  2. If IP allowlisting is operationally too rigid, add an outer auth gate such as Cloudflare Access, Tailscale Funnel policy, or equivalent identity-aware proxy before traffic reaches `apps/admin`.
- The nginx template already reserves an admin-only server block in [nginx/veteranfinder.conf](/c:/Users/rhysl/OneDrive/Documents/GitHub/VF/nginx/veteranfinder.conf:137). Production rollout should uncomment the allow/deny block or replace it with the chosen outer gate before exposing the hostname publicly.
- Admin browser cookies and CORS should remain same-origin only. `ADMIN_URL` must stay pinned to `https://admin.veteranfinder.co.uk`, and the API should not use wildcard origins in production.

## CSP follow-up

- The web and admin Next.js middleware still permit `script-src 'unsafe-inline'` because Next.js runtime bootstrap scripts are injected inline today.
- Remaining documented inline allowances:
  - `apps/web/src/middleware.ts`: `script-src 'self' 'unsafe-inline'` and `style-src 'self' 'unsafe-inline'`
  - `apps/admin/src/middleware.ts`: `script-src 'self' 'unsafe-inline'` and `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`
- Regression coverage should keep those exact exceptions visible until the apps move to a nonce-only path. Any future CSP relaxation beyond those sources should require an explicit code review note.

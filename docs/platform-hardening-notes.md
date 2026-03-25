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

# VeteranFinder Web Frontend

Next.js 14 frontend for VeteranFinder, focused on veteran reconnection, Brothers in Arms, messaging, and BIA subscriptions.

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Zustand
- TanStack Query
- React Hook Form + Zod
- Framer Motion

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- API backend running on port 3000

### Installation

```bash
npm install
cp .env.example .env.local
npm run dev
```

Frontend runs at `http://localhost:3001`.

## Key Areas

- Authentication: login, registration, reset password, email verification
- Brothers in Arms: service-overlap based reconnection and requests
- Matches & Messaging: active connections and chat
- Profile & Verification: profile editing, veteran details, evidence upload
- Premium: BIA and BIA+ subscription flow
- Admin: dashboard, users, verification, reports, audit, settings

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

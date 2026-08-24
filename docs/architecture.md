# Architecture

## High-Level

```
┌─────────────────────┐       HTTPS / WS        ┌──────────────────────┐
│  Next.js Frontend   │ ◄─────────────────────► │  Express Backend     │
│  (Vercel)           │                         │  (self-hosted)       │
└─────────────────────┘                         └──────────┬───────────┘
                                                           │
                                            ┌──────────────┼──────────────┐
                                            │              │              │
                                            ▼              ▼              ▼
                                      PostgreSQL        Redis         Zcash stack
                                      (Prisma)       (optional)   (Zingo / node /
                                                                   lightwalletd)
```

## Frontend (`zec-bounties-frontend`)

- Next.js App Router
- Auth state and bounty data via React context (`BountyProvider`)
- Key routes (under `app/`):
  - `/` landing
  - `/login`
  - `/home`, `/dashboard`, `/bounties`, `/my-bounties`
  - `/bounty/...`
  - `/profile`, `/leaderboard`, `/kpis`
  - `/admin` (role-gated)
- UI: Tailwind + Radix primitives
- Address validation helpers (including WASM parser for Zcash addresses)

## Backend (`zec-bounties-backend`)

- Express 5 + JWT auth
- Prisma ORM → PostgreSQL
- Route modules:
  - `/auth` — GitHub OAuth + session
  - `/api/bounties` — CRUD, apply, submit, approve, export
  - `/api/zcash` — wallet params, import, payment-related helpers
  - `/api/transactions`
  - `/api/teams`
  - `/api/kpis`
  - `/api/users`
  - `/api/notifications` — push subscriptions
- WebSocket server for realtime updates (token-verified on upgrade)
- Cron jobs for due payments / scheduled work where configured
- Helpers under `helpers/` and `utils/` for email, cache, Zcash parsing, payment list construction

## Data Model (core)

- **User** — GitHub identity, role (`CLIENT` | `ADMIN` | `TEAM`), shielded address (`z_address` / `UA_address`), badges, notification prefs
- **Bounty** — title, description, amount, status, approval flags, payment flags, relations to creator / assignee / category
- **BountyApplication** / **WorkSubmission** — application and delivery workflow
- **ZcashParams** — per-user (and team) wallet configuration for sending
- **Team** / **TeamMember** / **TeamWallet** — collaborative wallets and membership
- **PushSubscription** — web push

Statuses roughly follow: `TO_DO` → `IN_PROGRESS` → `IN_REVIEW` → `DONE` (plus `CANCELLED`).

## Auth Flow

1. User hits `/auth/github`
2. GitHub OAuth callback exchanges code → access token → user + email
3. Backend upserts `User`, issues JWT
4. Frontend stores token and attaches it to API + WebSocket requests
5. Middleware `authenticate` / `isAdmin` / optional auth protect routes

## Payment Flow (simplified)

1. Bounty reaches `DONE` and is unpaid
2. System resolves paying wallet for the creator / team
3. Builds payment list (address + amount in zatoshis + memo)
4. Executes shielded send via Zingo / configured stack
5. Records payment state + transaction id
6. Notifies parties

Payment code paths should fail closed. Missing address, unresolved wallet, or node errors must not mark a bounty paid.

## Security Notes

- WebSocket upgrades require a valid JWT mapped to a real user
- Seeds must never be persisted in normal flows
- CORS locked to known frontend origins
- Admin routes gated by role

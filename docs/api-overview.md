# API Overview

Base URL (local): `http://localhost:9000`  
Production backend is configured separately; the frontend talks to the deployed API.

Auth: most mutating routes require a JWT obtained via GitHub OAuth (`Authorization: Bearer <token>` or equivalent cookie/header used by the frontend).

This is a high-level map of the main route modules. Inspect the route files for exact request/response shapes.

## Auth — `/auth`

| Method | Path | Notes |
|--------|------|-------|
| GET | `/auth/github` | Start GitHub OAuth |
| GET | `/auth/github/callback` | OAuth callback → issues session/JWT |
| (others) | profile / recovery related | See `routes/auth.js` |

## Bounties — `/api/bounties`

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/` | optional | List bounties |
| GET | `/:id` | optional | Bounty detail |
| POST | `/` | yes | Create bounty |
| PUT | `/:id` | admin | Update |
| POST | `/apply` | yes | Apply to bounty |
| GET | `/:bountyId/applications` | yes | List applications |
| GET | `/mine` | yes | Current user’s bounties |
| GET | `/export-payments` | admin | Export |
| GET | `/export-completed` | admin | Export |
| GET | `/stats/totals` | admin | Stats |

Submission / status transition endpoints live in the same router — check `routes/bounties.js` for the full set.

## Zcash — `/api/zcash`

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/import-wallet` | yes | Advanced: import via seed (never log seed) |
| (others) | wallet info / params | yes | See `routes/zcash.js` |

## Transactions — `/api/transactions`

Payment history and txid-related endpoints.

## Teams — `/api/teams`

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/` | yes | Create team |
| GET | `/` | yes | List |
| GET | `/:teamId` | yes | Detail |
| PATCH | `/:teamId` | yes | Update |
| DELETE | `/:teamId` | yes | Delete |
| POST | `/:teamId/members` | yes | Add member |

## KPIs — `/api/kpis`

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/top-contributors` | yes | Leaderboard data |
| PATCH | `/users/:id/badges` | admin | Badge management |

## Users — `/api/users`

Profile, address updates, role-related operations.

## Notifications — `/api/notifications`

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/push/subscribe` | yes | Web Push |
| POST | `/push/unsubscribe` | yes | |

## WebSocket

Realtime updates are served from the same HTTP server.

- Upgrade requires a valid JWT (query `token` or `Sec-WebSocket-Protocol`)
- Identity is derived server-side from the verified token

## Conventions

- Prefer consistent JSON error shapes: `{ success: false, message: "..." }`
- Admin-only routes use `isAdmin` middleware
- Optional auth uses `optionalAuthenticate` where public read is allowed
- Amounts for on-chain sends are handled in zatoshis (`ZEC * 1e8`)

For exact payloads, read the corresponding file under `zec-bounties-backend/routes/`.

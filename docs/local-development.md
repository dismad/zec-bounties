# Local Development

## Prerequisites

- Node.js (LTS recommended)
- npm (backend)
- Yarn or pnpm (frontend — respect existing lockfile)
- PostgreSQL (production schema uses Postgres; local can still use SQLite in some setups)
- Zcash stack for real payments:
  - Zebrad or compatible node
  - lightwalletd / Zaino as used by the project
  - Zingo CLI (or the native bindings the backend expects)

Zcash setup reference: https://zechub.wiki/developers

## Clone & Install

```bash
git clone https://github.com/ZecHub/zec-bounties.git
cd zec-bounties
```

### Backend

```bash
cd zec-bounties-backend
npm install
```

Create `.env` (see below). Then:

```bash
npx prisma generate
npx prisma db push          # or migrate depending on your workflow
npm run dev
```

Backend default: `http://localhost:9000` (check `PORT` in `.env` / `server.js`).

### Frontend

```bash
cd zec-bounties-frontend
yarn install                # or pnpm install
yarn dev
```

Frontend default: `http://localhost:3000`

## Environment Variables (Backend)

Create `zec-bounties-backend/.env`:

```env
# Server
PORT=9000
NODE_ENV=development
JWT_SECRET=change-me-to-a-long-random-string

# Database (Postgres recommended; SQLite possible for pure UI work)
DATABASE_URL="postgresql://user:pass@localhost:5432/zec_bounties"
# DATABASE_URL="file:./dev.db"   # only if intentionally using SQLite

# GitHub OAuth
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:9000

# Zcash RPC / node
ZCASH_RPC_USER=rpcuser
ZCASH_RPC_PASS=rpcpassword
ZCASH_RPC_URL=http://localhost:8232

# Zingo
ZINGO_CLI=/absolute/path/to/zingo-cli

# Optional email / notifications
SMTP_USER=
SMTP_PASS=
DEV_EMAIL_FALLBACK=
```

### GitHub OAuth App

1. https://github.com/settings/developers → New OAuth App
2. Homepage URL: `http://localhost:3000`
3. Authorization callback URL: `http://localhost:9000/auth/github/callback` (or whatever your backend callback is)
4. Copy Client ID + Secret into `.env`

## Running Without Full Zcash Stack

- UI, auth, bounty CRUD, applications, and submissions can work without a live node.
- Actual ZEC transfers will fail until Zebrad/Zaino/Zingo (or the configured lightwalletd path) is correctly set up.
- Never commit real seeds or production credentials.

## Database Notes

- Schema is defined in `zec-bounties-backend/prisma/schema.prisma`.
- Production uses PostgreSQL.
- To reset a local DB: drop/recreate the database (or delete the SQLite file) and re-run `prisma db push` / migrations.
- After schema changes always run `npx prisma generate`.

## Common Issues

| Symptom | Check |
|---------|--------|
| Prisma client errors | `npx prisma generate` after schema changes |
| GitHub login fails | Callback URL, Client ID/Secret, `FRONTEND_URL` |
| RPC connection refused | Zebrad running, correct `ZCASH_RPC_*` values |
| Payments fail | Zingo path, wallet params, funds, shielded address validity |
| CORS errors | `FRONTEND_URL` matches the origin you are using |
| Port in use | Change `PORT` or free the port |

## Scripts

**Backend**

```bash
npm run dev          # nodemon server.js
```

**Frontend**

```bash
yarn dev
yarn build
yarn start
```

## Testing Payments Locally

1. Run a node + lightwalletd / required services.
2. Import or configure a test wallet with testnet or mainnet funds as appropriate.
3. Use only addresses you control.
4. Prefer testnet when experimenting.

Mainnet funds are real. Treat them accordingly.

# Zcash Integration

ZEC Bounties is built around **shielded** Zcash payments.

## Design Goals

- Payouts use shielded addresses only
- Transparent addresses are rejected at validation time
- Seed phrases are not stored by the application in normal user flows
- Transaction IDs are recorded so payments remain verifiable
- Paying wallet resolution supports individual and team wallets

## Components

| Component | Role |
|-----------|------|
| Address validation | `verifyZaddress` / `verifyUaddress` + WASM parser on frontend |
| ZcashParams | Per-user / team wallet configuration (account name, chain, server URL) |
| resolvePayingWallet | Selects which wallet funds a given bounty |
| Zingo CLI / native | Send, parse address, wallet info, recovery helpers |
| Node / lightwalletd | Backend connectivity (Zebrad, Zaino, or equivalent) |

## Address Rules

- Required for receiving payouts: valid shielded address (`z…`) or Unified Address containing a shielded receiver
- Transparent (`t…`) addresses must be rejected
- Validation happens both on the client (UX) and server (enforcement)

Never relax these checks.

## Payment Construction

High-level path:

1. Find due bounties (`status = DONE`, `isPaid = false`)
2. Resolve assignee shielded address
3. Resolve the paying wallet for the bounty creator / team
4. Convert ZEC amount → zatoshis (`amount * 1e8`)
5. Build payment list with memo (e.g. bounty title)
6. Execute send
7. Persist payment state + txid

Grouped payments by wallet are supported so one wallet can pay multiple recipients in a batch where the stack allows it.

## Wallet Configuration

`ZcashParams` stores:

- `accountName`
- `chain` (mainnet / testnet)
- `serverUrl` (lightwalletd endpoint, default often `https://zec.rocks:443`)
- ownership (user or team)

Import / seed-based setup exists for advanced operators. Treat seed handling as highly sensitive:

- Prefer offline generation
- Never log seeds
- Prefer not to keep seeds on the application server longer than required for the operation

## Local vs Production

- UI and non-payment flows work without a live node
- Real sends require a correctly configured Zingo path + reachable lightwalletd / node
- Mainnet uses real value — test thoroughly on testnet first when possible

## Operational Checklist

Before enabling production payouts:

- [ ] Node / lightwalletd healthy and synced
- [ ] Paying wallets funded and reachable
- [ ] Address validation confirmed rejecting transparent addresses
- [ ] Failure paths tested (node down, invalid address, insufficient funds)
- [ ] Logging redacts sensitive material
- [ ] Backup / recovery process for operational wallets documented offline

## Related Code Locations

- `routes/zcash.js` — wallet import / zcash API surface
- `helpers/zcash/` — resolvePayingWallet, helpers
- `helpers/db-query.js` — payment list builders, due bounty queries
- `utils/zingo/` — CLI / native wrappers
- Frontend address components under `components/address/`

## Privacy Properties

Do not introduce features that:

- Require transparent addresses for core flows
- Leak amount / sender / receiver linkage beyond what a shielded tx already reveals on-chain
- Store recovery information without strong access control (OTP-protected recovery exists in some flows — keep it protected)

When in doubt, prefer less data collection and stricter validation.

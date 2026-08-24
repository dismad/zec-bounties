# ZEC Bounties — User Guide

Privacy-first bounty platform for the Zcash ecosystem.  
Live: [https://bounties.zechub.wiki](https://bounties.zechub.wiki)

## Overview

ZEC Bounties lets the community post tasks, apply, submit work, and receive **shielded ZEC** payouts without the usual friction of collecting addresses and paying separately.

Key properties:

- GitHub OAuth login
- Only shielded addresses accepted for payouts
- Transparent addresses are rejected
- Transaction IDs available for transparency after payment

## Getting Started

### 1. Sign in

1. Go to [https://bounties.zechub.wiki](https://bounties.zechub.wiki)
2. Click **Sign in with GitHub**
3. Authorize the application

### 2. Register a shielded address

On first use (or if missing) you must provide a valid **shielded** Zcash address:

- Shielded addresses start with `z` (or a Unified Address that contains a shielded receiver)
- Transparent addresses (`t…`) are **not** accepted

Recommended wallets / resources:

- [ZecHub Developer & Wallet resources](https://zechub.wiki/developers)
- Zashi, Zingo, YWallet, or other maintained shielded wallets

Keep your seed phrase offline and never share it with the platform. The platform stores only the address needed for payouts.

### 3. Complete your profile (optional but useful)

- Nickname
- Bio
- Avatar (from GitHub)
- Notification preferences

## For Contributors (Bounty Hunters)

### Browse bounties

- Open bounties are listed on the main dashboard / bounties pages.
- Filter by status, category, or search.

### Apply

1. Open a bounty
2. Submit an application / express interest
3. Wait for assignment (creator or admin selects assignees)

### Submit work

1. Once assigned, complete the work according to the bounty description
2. Submit the deliverable (usually a link — PR, document, design, etc.)
3. Status moves to review

### Payment

- After approval the bounty is marked complete / ready for payout
- Payout is executed as a shielded transaction
- You can view the transaction ID for verification

## For Bounty Creators

### Propose a bounty

1. Create a new bounty with clear title, description, amount (ZEC), and deadline
2. New bounties typically require **admin approval** before becoming publicly active

### Review applications & submissions

- Review applicants and assign the contributor(s)
- Review submitted work
- Approve when complete

### Payout

- Once approved and marked done, payment can be triggered (one-click or batched by admins)
- Funds move via shielded transaction to the assignee’s registered address
- Transaction ID is recorded for transparency

## Admin

Users with the `ADMIN` role (or temporary admin switch for designated accounts) can:

- Approve or edit bounties
- Manage users / badges
- Export payment and completed-bounty data
- Oversee KPIs and leaderboard

Admin actions are privileged — treat them carefully.

## Teams

Teams allow shared wallets and coordinated work:

- Create or join a team
- Team wallets can be used for payouts where configured
- Roles: OWNER / ADMIN / MEMBER

## Leaderboard & KPIs

The platform tracks completed work and displays contributor rankings.

Note: Rankings should be deterministic. If you observe reshuffling between refreshes with no data changes, report it as a bug.

## Privacy Notes

- Only shielded addresses are used for payouts.
- Seed phrases and private keys are **never** stored by the application for normal user flows.
- Wallet import features (where present) are for advanced / self-hosted use and must be handled with extreme care.
- Prefer viewing transaction IDs on a block explorer that respects privacy expectations.

## FAQ

**Why was my transparent address rejected?**  
Payouts are shielded-only by design. Provide a `z…` or valid Unified Address with a shielded component.

**I completed work but haven’t been paid.**  
Confirm the submission was approved and the bounty status is done / payment authorized. Contact the bounty creator or ZecHub admins if it remains stuck.

**Can I change my payout address?**  
Yes — update it in your profile / address settings. Future payments use the currently registered shielded address.

**Is the platform on mainnet?**  
Yes. Real ZEC moves on mainnet. Double-check amounts and addresses.

**Where do I get help?**

- GitHub issues: https://github.com/ZecHub/zec-bounties/issues
- ZecHub Discord / community channels
- ZecHub on X: @ZecHub

## Suggesting New Bounties

You can propose tasks that benefit the Zcash ecosystem (docs, code, design, education, tooling). Clear scope and fair ZEC amounts improve the chance of approval.

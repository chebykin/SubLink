# SubLink

SubLink is a privacy-preserving subscription protocol powered by Unlink private transfers on Base Sepolia.

## Monorepo Layout

- `frontend/` - main SubLink frontend (Vue + Vite)
- `backend/` - Bun + TypeScript API, SQLite state, cron charger, verification API
- `ops/` - manual scripts for creator setup, subscribe flow, bearer token, and demo orchestration
- `mock-sites/` - two creator-site builds (`site-a`, `site-b`) from shared Vue source

## Root Commands

- `bun run dev:frontend` - run frontend dev server
- `bun run backend` - run backend API (simple run mode)
- `bun run backend:dev` - run backend with watch mode
- `bun run check` - typecheck frontend + backend
- `bun run test` - run frontend + backend tests
- `bun run build` - build frontend
- `bun run build:site-a` - build mock creator site A
- `bun run build:site-b` - build mock creator site B

## How It Works

### Accounts

Each participant has two types of accounts:

**EVM Wallet** — a standard Ethereum wallet (private key). Used to sign messages and approve on-chain ERC-20 transfers. This is the subscriber's or creator's "real" identity.

**Unlink Account** — a privacy-preserving account on the Unlink protocol. Created from a deterministic seed so it can be re-derived without storing extra keys. Holds private USDC balance and can send/receive private transfers. Neither the sender, receiver, nor amount are visible on-chain.

Creators register one Unlink account when they set up. Subscribers derive a **dedicated Unlink account per plan** — the wallet signs `"sublink:<planId>"`, the result is hashed with Keccak256 to produce a seed, which together with a deterministic index creates the Unlink account. This means each subscription gets its own isolated funding source.

### Auth Key

The auth key is a secp256k1 keypair derived deterministically from the subscriber's EVM wallet:

1. Wallet signs the message `"sublink-auth-v1"`
2. `authSeed = Keccak256(signature)`
3. `authAccount = PrivateKeyAccount(authSeed)` — a full secp256k1 keypair
4. `authKeyId = last 20 bytes of Keccak256(uncompressed public key without 0x04 prefix)` — same derivation as an Ethereum address

The auth key is stable for a given wallet — re-deriving it always produces the same keypair. It serves as the subscriber's identity within SubLink without exposing their EVM address.

### Subscribing (Proof of Auth Key Ownership)

When subscribing, the client proves ownership of the auth key by signing a proof message:

```
sublink-subscribe-v1:<planId>:<unlinkAddress>:<authKeyId>
```

The server verifies that:
1. The `authPublicKey` hashes to the claimed `authKeyId`
2. ECDSA recovery on the signature yields the same `authKeyId`

This binds the subscription to a specific auth key and Unlink address. The server also receives the dedicated account's encrypted keys so it can execute charges on the subscriber's behalf via cron.

### Bearer Token (Ongoing Authentication)

After subscribing, the subscriber authenticates with a self-issued bearer token:

```
Authorization: Bearer <subscriptionId>.<expiry>.<signature>
```

Where `signature` is ECDSA over the message `sublink-bearer-v1:<subscriptionId>:<expiry>`, signed with the auth private key.

The server recovers the `authKeyId` from the signature — no server-side token storage. Tokens expire after 24h (configurable), with 30s clock skew tolerance.

### Creator Verification

Creators verify subscriber access from their backend via `GET /verify/:planId`. This requires two credentials:

- **`x-api-key` header** — the creator's API key (32 random hex chars, issued at creator registration). Proves the caller is the plan's owner.
- **`Authorization: Bearer` header** — the subscriber's bearer token, forwarded by the creator's site.

The server checks: API key matches the plan's creator, bearer token is valid, recovered `authKeyId` has an active subscription to this plan.

If the subscriber has no token or an invalid one, the endpoint returns a 402 with plan metadata and the SubLink API URL — a discovery response the frontend can use to prompt subscription.

## Required Env Vars

- `UNLINK_API_KEY` — Unlink protocol API key
- `UNLINK_API_ENDPOINT` — Unlink engine URL
- `DEPLOYER` — private key for deploying contracts
- `ALICE` — subscriber wallet private key (ops scripts)
- `BOB` — creator/receiver wallet private key (ops scripts)

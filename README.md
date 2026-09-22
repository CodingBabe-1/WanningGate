# WanningGate

> A private allowlist claim gate on Midnight: it counts successful claims in public while never revealing who claimed.

[![CI](https://github.com/CodingBabe-1/WanningGate/actions/workflows/ci.yml/badge.svg)](https://github.com/CodingBabe-1/WanningGate/actions/workflows/ci.yml)

## Contract Address

| Network  | Address                                                                   |
| -------- | ------------------------------------------------------------------------- |
| Preview  | `[PASTE PREVIEW ADDRESS AFTER DEPLOY]`                                     |
| Preprod  | `[PASTE PREPROD ADDRESS AFTER DEPLOY]`                                     |

> Local `undeployed` devnet deploy address is written to `.midnight-state.json`
> (gitignored) and printed by `npm run deploy`. The public-network addresses
> above are filled in once the wallet has been funded from the matching faucet.

## What This Does

WanningGate is the Level 1 seed of a private access-control module. A gate
starts **closed** and an operator can **open** or **close** it. While the gate
is open, a member can **claim** entry by proving they hold an allowlist secret.

What makes it interesting is what the chain learns. Each claim publishes only:

- a running **`claimCount`** — the operator's audit trail ("N members entered"),
- a one-way **`lastClaimTag`** — a commitment of the claimant's secret, and
- the current **`gateOpen`** admin flag.

The claimant's actual secret is a **private witness**. It never reaches the
ledger, a transaction, the node, or the indexer. The same secret always derives
the same tag, so the operator can still detect a double-claim — without ever
learning *who* is claiming.

In short: **the count is public, the identity is private.**

## Privacy Model

### What is PUBLIC (on-chain, visible to anyone)

| Ledger field    | Type        | Why it is public                                              |
| --------------- | ----------- | ------------------------------------------------------------- |
| `claimCount`    | `Counter`   | The operator's audit trail — "N claims happened".             |
| `lastClaimTag`  | `Bytes<32>` | A commitment (hash) of the latest secret, for double-claim detection. |
| `gateOpen`      | `Boolean`   | Admin state — anyone can see if the gate is accepting claims. |

### What is PRIVATE (private witness, never on-chain)

- **`memberSecret()`** — the caller's allowlist secret, supplied as a circuit
  witness. It lives only in the caller's local private state and inside the
  zero-knowledge proof. It is never written to the ledger, never placed in a
  transaction, and never observable by the node, the indexer, or any other
  party.

### What the user PROVES without revealing

The caller proves: *"I know a secret that hashes to a valid tag, and the gate
is open."* The proof demonstrates knowledge of the secret **without disclosing
it**. Only the derived tag reaches public state, and `disclose()` is used
**exactly once and deliberately** — on the tag, never on the secret itself.

The full reasoning lives in the comment block at the top of
[`contracts/counter.compact`](contracts/counter.compact).

## Tech Stack

- **Midnight network** — the privacy-first blockchain this contract targets.
- **Compact** — Midnight's zero-knowledge smart-contract language.
- **Node.js v22+** — runtime for the deploy/CLI tooling (see `.nvmrc`-style
  `engines` in `package.json`).
- **Docker** — runs the local devnet (node, indexer, proof server).
- **Midnight.js (`@midnight-ntwrk/midnight-js-*`)** — SDK for deploy and calls.
- **Vitest** — test runner for the contract logic tests.

## Prerequisites

- **Node.js v22 or newer** (`node --version`).
- **Docker** with Compose v2 (`docker compose version`).
- **The Compact compiler** for compiling the contract:
  ```bash
  npm install -g @midnight-ntwrk/compact-compiler
  compact --version   # prints a version number, e.g. 0.5.2
  ```
- **The proof server** image (only needed for real on-chain deploys):
  ```bash
  docker pull midnightntwrk/proof-server
  ```
- A **GitHub account** (optional) if you want the included CI workflow to run.

## Setup

### 1. Clone and install

```bash
git clone https://github.com/CodingBabe-1/WanningGate
cd WanningGate
npm install
```

### 2. Compile the contract

```bash
npm run compile
```

This writes `managed/counter/` with the contract JS, circuit prover/verifier
keys, and zkir. The directory is **committed** so tests and deploys work
without a local toolchain — regenerate it any time with this command.

### 3. Start the local devnet

```bash
npm run proof-server:start     # or: docker compose up -d --wait
```

This starts:

| Service        | Port | Purpose                                       |
| -------------- | ---- | --------------------------------------------- |
| `node`         | 9944 | Midnight node, `dev` chain preset             |
| `indexer`      | 8088 | GraphQL indexer for chain state               |
| `proof-server` | 6300 | Generates ZK proofs for contract transactions |

### 4. Deploy

```bash
npm run deploy                          # local devnet (undeployed)
npm run deploy -- --network preview     # public preview testnet
npm run deploy -- --network preprod     # public preprod testnet
```

On the local devnet the wallet is pre-funded. On `preview` / `preprod` the
script prints a wallet address and the faucet URL, then waits for you to fund
it before continuing:

- Preview faucet: <https://midnight-tmnight-preview.nethermind.dev>
- Preprod faucet: <https://midnight-tmnight-preprod.nethermind.dev>

The deployed address is printed and saved to `.midnight-state.json`.

### 5. Interact (optional)

```bash
npm run cli              # open/close the gate, claim, read public state
npm run check-balance    # NIGHT / DUST balances
```

## Run Tests

```bash
npm test
```

The suite runs the **real compiled circuits** from `managed/counter/` against
an in-memory circuit context — no network, no wallet, no proof server. Eight
tests cover:

1. **Circuit logic** — deterministic init, counter increments per claim.
2. **State transitions** — open/close, rejection while closed, tag stability
   and separation.
3. **Privacy** — the witness secret stays in private state and never appears
   in the serialised public ledger.

Use `npm run test:watch` for watch mode, and `npm run test:e2e` for a
read-back smoke check against an already-deployed contract.

## Project Structure

```
WanningGate/
├── contracts/
│   └── counter.compact          # the Compact contract (public/private documented inline)
├── managed/                     # auto-generated by `compact compile` (committed)
│   └── counter/
│       ├── contract/            # generated JS + type declarations
│       ├── keys/                # prover + verifier keys per circuit
│       └── zkir/                # circuit intermediate representation
├── src/
│   ├── contract.ts              # shared binding to the compiled contract
│   ├── witnesses.ts             # private witness + private state
│   ├── claim-secret.ts          # the local, gitignored allowlist secret
│   ├── network.ts               # network selection + state file
│   ├── wallet.ts                # wallet construction + sync cache
│   ├── setup.ts                 # one-shot devnet start + compile + deploy
│   ├── deploy.ts                # deploy the contract
│   └── cli.ts                   # interact with a deployed contract
├── tests/
│   └── counter.test.ts          # 8 contract tests
├── scripts/
│   └── e2e-check.ts             # post-deploy read-back smoke check
├── .github/workflows/ci.yml     # typecheck + tests on push/PR
├── docker-compose.yml           # local devnet (node, indexer, proof-server)
├── package.json
└── README.md
```

## CI

`.github/workflows/ci.yml` runs on every push to `main` and on pull requests:
it installs dependencies, typechecks with `tsc --noEmit`, and runs the test
suite. Because `managed/` is committed, CI needs neither the Compact compiler
nor Docker to verify the contract logic.

## Local devnet only — a note on seeds

The `undeployed` network uses a well-known genesis seed so the pre-minted
NIGHT on the local `dev` chain preset is immediately available. **Do not use
that seed against Preprod, mainnet, or any environment handling real value.**
Public-network wallets use a generated BIP-39 recovery phrase stored in
`.midnight-state.json` (gitignored).

## Initial Idea

<!-- PLACEHOLDER — to be filled in manually by the author. -->

_[Describe the original WanningGate idea here: what problem it solves, who the
operator and members are, and what the full product becomes in Level 2.]_

## Screenshots

<!-- PLACEHOLDER — add compile output and the deployed contract address here. -->

| What                    | Image                         |
| ----------------------- | ----------------------------- |
| `compact compile` output | `[ADD SCREENSHOT]`           |
| Deployed contract address | `[ADD SCREENSHOT]`          |

## License

MIT

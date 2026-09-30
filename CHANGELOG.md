# Changelog

All notable changes to WanningGate are recorded in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Added
- `.compact-version` — pins the Compact toolchain at `0.31.1` so every
  contributor and CI runner compiles with the same version that produced
  the committed `managed/` artifacts. Installing a newer toolchain emits a
  different `checkRuntimeVersion()` and causes the contract to fail at
  deploy time.
- Improved `vitest.config.ts` — `testTimeout: 10_000`, `reporters: ['verbose']`,
  `pool: 'forks'`, and block comments explaining every option.
- `SECURITY.md` — vulnerability disclosure policy, scope table, privacy model
  boundary summary, and dependency security notes.
- `CONTRIBUTING.md` — contributor guide covering prerequisites, toolchain
  version lock, running tests, privacy guidelines, and PR process.
- `CHANGELOG.md` — this file.

---

## [Level 1] — 2026-09-30

### Added

#### Contract
- `contracts/counter.compact` — WanningGate claim-gate contract:
  - Three public ledger fields: `claimCount` (Counter), `lastClaimTag`
    (Bytes<32>), `gateOpen` (Boolean).
  - One private witness: `memberSecret()` — the caller's allowlist secret,
    never written to the ledger.
  - Three circuits: `openGate()`, `closeGate()`, `claim()`.
  - One deliberate `disclose()` call: on the derived tag only, never on the
    raw secret.
  - Full comment block documenting the public/private boundary.
- `managed/counter/` — compiled artifacts (contract JS + type declarations,
  prover/verifier keys, ZKIR) committed so tests and CI work without a local
  toolchain.

#### Tests
- `tests/counter.test.ts` — 8 tests covering:
  - **Circuit logic** (2) — deterministic initialisation, counter increments.
  - **State transitions** (4) — open/close transitions, rejection while
    closed, stable tag for same secret, different tags for different secrets.
  - **Privacy** (2) — secret stays in private state; raw secret bytes never
    appear in the serialised public ledger.

#### Source modules
- `src/witnesses.ts` — `CounterPrivateState` type and `memberSecret` witness
  implementation (the TypeScript side of the privacy boundary).
- `src/contract.ts` — shared compiled-contract binding used by deploy and CLI.
- `src/deploy.ts` — deploy to `undeployed` (local devnet), `preview`, or
  `preprod` with wallet sync, faucet polling, and DUST gating.
- `src/cli.ts` — interactive CLI: open/close the gate, claim, print state.
- `src/network.ts` — network configs, faucet URLs, state-file management.
- `src/wallet.ts` / `src/wallet-state.ts` — wallet construction and sync-state
  cache.
- `src/claim-secret.ts` — loads the local (gitignored) allowlist secret.
- `src/check-balance.ts` — NIGHT / DUST balance diagnostics.
- `src/setup.ts` — one-shot devnet start + compile + deploy helper.
- `scripts/e2e-check.ts` — post-deploy read-back smoke test.

#### Infrastructure
- `docker-compose.yml` — local devnet with Midnight node, indexer, and proof
  server (pinned versions with documented healthchecks).
- `.github/workflows/ci.yml` — CI pipeline: typecheck + tests on push and PR.
- `package.json` — `compile`, `deploy`, `cli`, `test`, `check-balance` scripts.
- `vitest.config.ts` — Vitest configuration for the in-process test suite.

#### Deployment
- Contract deployed to **Preview** testnet:
  `94971f61fe1f9dc870c9d6cfdee2bfd060f48b5a9b6350cc2157b55090dea777`
- Deployer wallet:
  `mn_addr_preview1k0z7xrtt0hmgpdpavxye9lp4ztsz98qyz5tglak2jzzz5wuk0gwsv5wma4`

#### Documentation
- `README.md` — full Level 1 documentation: contract address, What This Does,
  Privacy Model, Tech Stack, Prerequisites, Setup, Run Tests, Project Structure,
  CI section, Initial Idea placeholder, Screenshots placeholder.

# Contributing to WanningGate

Thank you for your interest in contributing. This guide covers everything you
need to get the project running locally, understand the toolchain constraints,
and open a pull request.

---

## Table of Contents

1. [Project overview](#project-overview)
2. [Prerequisites](#prerequisites)
3. [Getting started](#getting-started)
4. [Toolchain version lock](#toolchain-version-lock)
5. [Running tests](#running-tests)
6. [Making changes](#making-changes)
7. [Privacy guidelines](#privacy-guidelines)
8. [Opening a pull request](#opening-a-pull-request)

---

## Project overview

WanningGate is a private allowlist claim gate built on the
[Midnight](https://midnight.network/) network. It counts successful claims
publicly while keeping every claimant's identity private.

| Layer | Location | Language |
|---|---|---|
| Claim-gate contract | `contracts/counter.compact` | Compact |
| Deploy / CLI scripts | `src/*.ts` (Node) | TypeScript |

The compiled artifacts in `managed/` are committed so tests and CI work
without installing the Compact toolchain locally.

---

## Prerequisites

| Requirement | Version | Check |
|---|---|---|
| Node.js | v22+ | `node --version` |
| npm | v10+ | `npm --version` |
| Docker (with Compose v2) | any recent | `docker compose version` |
| Compact compiler (optional) | 0.5.x devtools | `compact --version` |

The Compact compiler is only needed if you change `contracts/counter.compact`.
For all other changes (TypeScript, tests, docs) it is not required.

Install the Compact devtools:

```bash
curl --proto '=https' --tlsv1.2 -LsSf \
  https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh
source $HOME/.local/bin/env
compact update "$(cat .compact-version)"   # installs the pinned toolchain
compact compile --version                  # must print 0.31.1
```

---

## Getting started

```bash
# Clone
git clone https://github.com/CodingBabe-1/WanningGate
cd WanningGate

# Install dependencies
npm install

# Run the tests (no Docker, no compiler needed)
npm test
```

---

## Toolchain version lock

The Compact toolchain and the JavaScript runtime are **version-locked**. This
project pins toolchain `0.31.1` in `.compact-version`:

```
Compact toolchain 0.31.1  →  emits checkRuntimeVersion('0.16.0')
compact-runtime@0.16.0    ←  exact pin in package.json
```

Installing the latest toolchain emits a different `checkRuntimeVersion()` value
and causes the contract to fail at deploy time — not at compile time, so the
error is easy to miss.

**Always install the pinned toolchain:**

```bash
compact update "$(cat .compact-version)"
compact compile --version   # must print 0.31.1
```

---

## Running tests

```bash
npm test              # run the 8-test suite (no Docker, no network)
npm run test:watch    # watch mode
npm run test:e2e      # smoke check against an already-deployed contract
```

All 8 tests must pass before opening a pull request. The suite covers:

1. **Circuit logic** — the counter increments; the gate initialises closed.
2. **State transitions** — open/close, rejection while closed, tag stability
   and separation.
3. **Privacy** — `memberSecret` never appears in the serialised public ledger.

---

## Making changes

### Changing the Compact contract

1. Edit `contracts/counter.compact`.
2. Recompile: `npm run compile` (requires toolchain `0.31.1`).
3. Stage both `contracts/counter.compact` and the regenerated `managed/`
   directory in your commit. CI checks are currently type-based only, but
   committing the artifacts allows reviewers to inspect the circuits.
4. Run `npm test` — all 8 tests must pass.

### Changing TypeScript source

1. Edit files under `src/` or `tests/`.
2. Run `npx tsc --noEmit` to check types.
3. Run `npm test`.

---

## Privacy guidelines

WanningGate's privacy guarantee rests on a single design rule: the
`memberSecret()` witness value **must never be passed to `disclose()`**. There
is exactly one `disclose()` call site in the contract, on the derived tag:

```compact
lastClaimTag = disclose(tag);   // ← tag is a hash — safe to publish
                                // memberSecret() is NOT disclosed
```

When contributing to the contract or the witness layer:

1. **Never add `disclose(memberSecret())` or any derivative that reveals
   the raw secret.** If a new circuit needs to reference the secret,
   always hash it first.
2. **Never log or print the witness value** in `src/witnesses.ts` or any
   calling code.
3. **Run the privacy test** after any contract change:
   `never exposes the private witness input in public ledger state`.
   If it fails, the change has introduced a privacy regression.

---

## Opening a pull request

1. Fork the repository and create a branch from `main`.
2. Make your changes following the guidelines above.
3. Ensure `npm test` and `npx tsc --noEmit` both pass.
4. Push your branch and open a pull request against `main`.
5. Describe what changed and what you tested.

CI runs automatically on every pull request. Both `Typecheck` and
`Run contract tests` must be green before a PR can be merged.

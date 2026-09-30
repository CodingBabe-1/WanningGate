# Security Policy

## Supported Versions

WanningGate is a Midnight Builder Challenge Level 1 submission running on the
**Preview** testnet. No Mainnet deployment exists yet.

| Version | Supported |
|---|---|
| `main` branch (testnet) | ✅ Active development |
| Any prior tagged release | ❌ Not supported |

---

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report security issues by emailing the repository owner via GitHub direct
message, or through the contact information on the CodingBabe-1 GitHub profile.

Include as much of the following as possible:

- A clear description of the vulnerability.
- Steps to reproduce or a proof-of-concept.
- The component(s) affected: Compact contract, TypeScript witness layer,
  deploy scripts, CI pipeline, or a dependency.
- The potential impact (privacy leak, denial-of-service, fund loss, etc.).

You will receive an acknowledgement within **48 hours**.

---

## Scope

### In scope

| Area | Notes |
|---|---|
| `contracts/counter.compact` | The Compact claim-gate contract — privacy boundary, `disclose()` call site, circuit logic |
| `src/witnesses.ts` | The TypeScript side of the privacy boundary — the `memberSecret` witness |
| `src/contract.ts` | Compiled-contract loading and binding |
| `src/deploy.ts` | Deployment script |
| `.github/workflows/ci.yml` | CI pipeline integrity |
| Dependency versions | Suspicious or unexpected transitive dependencies |

### Out of scope

- The Midnight protocol itself (report to the Midnight team).
- The Compact toolchain (report to IOG / Midnight).
- Issues only reproducible on Mainnet once Mainnet exists.

---

## Privacy Model — The Security Boundary

The core security boundary of WanningGate is the **witness layer**. The Compact
compiler enforces that no witness-derived value reaches the public ledger without
an explicit `disclose()` call.

WanningGate has **exactly one** `disclose()` call site, auditable in a single
line of `contracts/counter.compact`:

```compact
lastClaimTag = disclose(tag);   // tag = persistentHash(secret) — hash only, not secret
```

`disclose()` is applied to the **derived tag**, never to `memberSecret()` itself.
A vulnerability in this area would be one that causes `memberSecret()` — the
caller's raw allowlist secret — to reach the public ledger, a transaction
payload, a log file, or any observable output.

### Known design trade-off (not a vulnerability)

The same secret always produces the same tag (`persistentHash` is deterministic).
This is intentional: it enables the operator to detect a double-claim without
learning who claimed. A party who already knows a member's secret can confirm
whether that member has claimed by computing the tag independently. This is
documented in the contract comment block and is a deliberate product decision,
not a bug.

---

## Dependency Security

Key version pins:

| Package | Pin | Reason |
|---|---|---|
| `@midnight-ntwrk/compact-runtime` | `0.16.0` (exact) | Must match the runtime version emitted by Compact toolchain 0.31.1 |
| Compact toolchain | `0.31.1` (`.compact-version`) | Toolchain/runtime version lock |

If you discover a dependency with an unexpected version or a supply-chain issue
with any pinned package, please report it as a vulnerability.

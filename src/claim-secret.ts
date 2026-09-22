/**
 * The member's allowlist secret — the value behind the `memberSecret()` witness.
 *
 * This is private input: it is never transmitted, never written to the ledger,
 * and never leaves the machine. It is persisted locally so that repeated
 * deploys and CLI calls prove against the *same* commitment tag, which is what
 * makes the double-claim audit meaningful.
 *
 * Resolution order:
 *   1. `WANNING_GATE_SECRET` env var (64 hex chars) — for CI and one-off runs
 *   2. `.wanning-gate-secret` in the project root (gitignored)
 *   3. freshly generated, then written to that file with owner-only permissions
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomBytes } from 'node:crypto';

export const CLAIM_SECRET_FILE = '.wanning-gate-secret';

const SECRET_HEX_RE = /^[0-9a-fA-F]{64}$/;

export interface ClaimSecret {
  secret: Uint8Array;
  /** True when this call generated the secret (so the caller can warn). */
  created: boolean;
  /** Where it came from, for logging. */
  source: 'env' | 'file' | 'generated';
}

function parseSecret(hex: string, source: ClaimSecret['source']): ClaimSecret {
  if (!SECRET_HEX_RE.test(hex)) {
    throw new Error(
      `${source === 'env' ? 'WANNING_GATE_SECRET' : CLAIM_SECRET_FILE} must be 64 hex characters (32 bytes).`,
    );
  }
  return { secret: Uint8Array.from(Buffer.from(hex, 'hex')), created: false, source };
}

export function getOrCreateClaimSecret(cwd: string = process.cwd()): ClaimSecret {
  const fromEnv = process.env.WANNING_GATE_SECRET?.trim();
  if (fromEnv) {
    const hex = fromEnv.startsWith('0x') ? fromEnv.slice(2) : fromEnv;
    return parseSecret(hex, 'env');
  }

  const file = path.join(cwd, CLAIM_SECRET_FILE);
  if (fs.existsSync(file)) {
    return parseSecret(fs.readFileSync(file, 'utf-8').trim(), 'file');
  }

  const generated = randomBytes(32);
  // Owner-only: this file is private input.
  fs.writeFileSync(file, `${generated.toString('hex')}\n`, { mode: 0o600 });
  return {
    secret: Uint8Array.from(generated),
    created: true,
    source: 'generated',
  };
}

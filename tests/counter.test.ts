/**
 * WanningGate counter contract — test suite.
 *
 * Runs the real compiled contract from `managed/counter` against an in-memory
 * circuit context. No network, no wallet, no proof server: `compact-runtime`
 * executes the circuits locally, which is exactly what the zero-knowledge
 * proof would execute on-chain.
 *
 * Coverage:
 *   1. Circuit logic      — the counter increments, the gate initialises closed
 *   2. State transitions  — open/close, rejection while closed, tag stability
 *   3. Privacy            — the witness secret never reaches public ledger state
 */
import { describe, it, expect } from 'vitest';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import {
  createCircuitContext,
  createConstructorContext,
  sampleContractAddress,
  type CircuitContext,
} from '@midnight-ntwrk/compact-runtime';
import { Contract, ledger, type Ledger } from '../managed/counter/contract/index.js';
import { witnesses, type CounterPrivateState } from '../src/witnesses.js';

// The circuits are network-agnostic; the runtime still wants a network id set.
setNetworkId('undeployed');

// ─── Fixtures ──────────────────────────────────────────────────────────────
// Fixed rather than random so failures are reproducible.

const SECRET_A = new Uint8Array(32).fill(7);
const SECRET_B = new Uint8Array(32).fill(9);

// ─── Simulator ─────────────────────────────────────────────────────────────
// A minimal harness that drives the compiled contract in-process. Each method
// returns the post-transition public ledger so assertions read like the chain.

class ClaimGateSimulator {
  readonly contract: Contract<CounterPrivateState>;
  circuitContext: CircuitContext<CounterPrivateState>;

  constructor(secret: Uint8Array = SECRET_A) {
    this.contract = new Contract<CounterPrivateState>(witnesses);

    const { currentPrivateState, currentContractState, currentZswapLocalState } =
      this.contract.initialState(
        // The coin public key is unused by this contract; any 64-char value works.
        createConstructorContext({ claimSecret: secret }, '0'.repeat(64)),
      );

    this.circuitContext = createCircuitContext(
      sampleContractAddress(),
      currentZswapLocalState,
      currentContractState,
      currentPrivateState,
    );
  }

  /** Public ledger state after the most recent transition. */
  getLedger(): Ledger {
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  /** Local private state — never on-chain. */
  getPrivateState(): CounterPrivateState {
    return this.circuitContext.currentPrivateState;
  }

  openGate(): Ledger {
    this.circuitContext = this.contract.impureCircuits.openGate(this.circuitContext).context;
    return this.getLedger();
  }

  closeGate(): Ledger {
    this.circuitContext = this.contract.impureCircuits.closeGate(this.circuitContext).context;
    return this.getLedger();
  }

  claim(): Ledger {
    this.circuitContext = this.contract.impureCircuits.claim(this.circuitContext).context;
    return this.getLedger();
  }
}

/** JSON-safe view of the public ledger, for "is the secret in here?" checks. */
function ledgerToJson(l: Ledger): string {
  return JSON.stringify(l, (_key, value) => {
    if (typeof value === 'bigint') return value.toString();
    if (value instanceof Uint8Array) return Array.from(value);
    return value;
  });
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('WanningGate claim gate — circuit logic', () => {
  it('initialises deterministically with an empty, closed gate', () => {
    const a = new ClaimGateSimulator();
    const b = new ClaimGateSimulator();

    expect(a.getLedger()).toEqual(b.getLedger());

    const initial = a.getLedger();
    expect(initial.claimCount).toBe(0n);
    expect(initial.gateOpen).toBe(false);
    expect(initial.lastClaimTag).toEqual(new Uint8Array(32));
  });

  it('increments the public claim counter once per accepted claim', () => {
    const sim = new ClaimGateSimulator();
    sim.openGate();

    expect(sim.claim().claimCount).toBe(1n);
    expect(sim.claim().claimCount).toBe(2n);
    expect(sim.claim().claimCount).toBe(3n);

    // The counter is cumulative, not a per-call delta.
    expect(sim.getLedger().claimCount).toBe(3n);
  });
});

describe('WanningGate claim gate — state transitions', () => {
  it('moves the gate between closed and open', () => {
    const sim = new ClaimGateSimulator();

    expect(sim.getLedger().gateOpen).toBe(false);
    expect(sim.openGate().gateOpen).toBe(true);
    expect(sim.closeGate().gateOpen).toBe(false);
  });

  it('rejects a claim while the gate is closed', () => {
    const sim = new ClaimGateSimulator();

    expect(() => sim.claim()).toThrow();
    // The failed transition must not have advanced the public counter.
    expect(sim.getLedger().claimCount).toBe(0n);
  });

  it('records a stable commitment tag for the same secret', () => {
    const sim = new ClaimGateSimulator(SECRET_A);
    sim.openGate();

    const first = sim.claim().lastClaimTag;
    const second = sim.claim().lastClaimTag;

    expect(second).toEqual(first);
  });

  it('records different tags for different secrets', () => {
    const a = new ClaimGateSimulator(SECRET_A);
    const b = new ClaimGateSimulator(SECRET_B);
    a.openGate();
    b.openGate();

    expect(a.claim().lastClaimTag).not.toEqual(b.claim().lastClaimTag);
  });
});

describe('WanningGate claim gate — privacy', () => {
  it('keeps the witness secret in private state only', () => {
    const sim = new ClaimGateSimulator(SECRET_A);
    sim.openGate();
    sim.claim();

    // Still available locally...
    expect(sim.getPrivateState().claimSecret).toEqual(SECRET_A);
  });

  it('never exposes the private witness input in public ledger state', () => {
    const sim = new ClaimGateSimulator(SECRET_A);
    sim.openGate();
    const publicLedger = sim.claim();

    // The published tag is a hash of the secret, not the secret itself.
    expect(publicLedger.lastClaimTag).not.toEqual(SECRET_A);

    // And the raw secret bytes appear nowhere in the serialised public state.
    const secretBytes = JSON.stringify(Array.from(SECRET_A));
    expect(ledgerToJson(publicLedger)).not.toContain(secretBytes);
  });
});

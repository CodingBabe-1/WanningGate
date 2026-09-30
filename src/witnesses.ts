/**
 * Private state and witness implementation for the WanningGate counter contract.
 *
 * This module is the **TypeScript side of the privacy boundary** declared in
 * `contracts/counter.compact`. The Compact compiler tracks every value derived
 * from a witness through the entire circuit and refuses to compile any path
 * that writes such a value to the public ledger without an explicit `disclose()`
 * call. The contract has exactly one `disclose()` call site — on the derived
 * tag, never on the raw secret:
 *
 * ```compact
 * const tag = persistentHash<Bytes<32>>(secret);  // private → private
 * lastClaimTag = disclose(tag);                   // private → public (hash only)
 * // memberSecret() itself is NEVER passed to disclose()
 * ```
 *
 * `claimSecret` is a member's allowlist secret. It lives only in this local
 * private state — the contract's `memberSecret()` witness hands it to the
 * circuit at proving time, and it is never written to the ledger, a
 * transaction, or anywhere the network can observe.
 *
 * @see `contracts/counter.compact` for the corresponding Compact declarations.
 */
import type { WitnessContext } from '@midnight-ntwrk/compact-runtime';
import type { Ledger } from '../managed/counter/contract/index.js';

export type CounterPrivateState = {
  readonly claimSecret: Uint8Array;
};

export type CounterWitnesses = {
  memberSecret(context: WitnessContext<Ledger, CounterPrivateState>): [CounterPrivateState, Uint8Array];
};

/** Build the private state a caller proves from. */
export const createCounterPrivateState = (claimSecret: Uint8Array): CounterPrivateState => ({
  claimSecret,
});

export const witnesses: CounterWitnesses = {
  /**
   * Supplies the caller's allowlist secret to the circuit.
   *
   * Called by the generated `Contract` class during proof generation for
   * `claim()`. The value returned is handed to the Compact circuit and used
   * exclusively to derive the public tag via `persistentHash`. It is never
   * returned from any circuit, never written to the ledger, and never
   * observable outside the proving process.
   *
   * The private state is passed through unchanged — `claimSecret` is
   * read-only at proving time.
   */
  memberSecret({
    privateState,
  }: WitnessContext<Ledger, CounterPrivateState>): [CounterPrivateState, Uint8Array] {
    // Only the secret itself crosses into the circuit. The returned private
    // state is passed through unchanged.
    return [privateState, privateState.claimSecret];
  },
};

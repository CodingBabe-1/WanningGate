/**
 * Private state and witness implementation for the WanningGate counter contract.
 *
 * `claimSecret` is a member's allowlist secret. It lives only in this local
 * private state — the contract's `memberSecret()` witness hands it to the
 * circuit at proving time, and it is never written to the ledger, a
 * transaction, or anywhere the network can observe.
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
  memberSecret({
    privateState,
  }: WitnessContext<Ledger, CounterPrivateState>): [CounterPrivateState, Uint8Array] {
    // Only the secret itself crosses into the circuit. The returned private
    // state is passed through unchanged.
    return [privateState, privateState.claimSecret];
  },
};

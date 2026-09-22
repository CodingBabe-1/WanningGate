/**
 * Shared binding to the compiled WanningGate counter contract.
 *
 * Deploy, CLI and e2e-check all need the same binding: the same witness
 * implementation, the same private-state id, and the same path to the compiler
 * output. Centralising it here means those three can never drift apart — a
 * mismatch in `PRIVATE_STATE_ID` in particular would silently orphan the
 * witness secret.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import { witnesses, type CounterWitnesses } from './witnesses';

/**
 * Identifier under which this contract's private state is stored. Must be
 * identical at deploy time and on every later reconnect.
 */
export const PRIVATE_STATE_ID = 'wanningGatePrivateState';

/** Where `npm run compile` writes the contract JS and circuit keys. */
export const zkConfigPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'managed',
  'counter',
);

const contractPath = path.join(zkConfigPath, 'contract', 'index.js');

let cachedModule: any;

/**
 * Loads the compiled contract module (the generated `Contract` class and
 * `ledger` accessor). Cached, and fails loudly if the contract is not compiled.
 */
export async function loadCounterModule(): Promise<any> {
  if (cachedModule) return cachedModule;

  if (!fs.existsSync(contractPath)) {
    console.error('\n❌ Contract not compiled! Run: npm run compile\n');
    process.exit(1);
  }

  cachedModule = await import(pathToFileURL(contractPath).href);
  return cachedModule;
}

/**
 * Builds the `CompiledContract` the Midnight SDK expects, with this contract's
 * witnesses and compiled ZK assets attached.
 *
 * The contract class arrives through a runtime `import()`, so its type is `any`
 * and `CompiledContract.make`'s generics cannot resolve — which makes
 * `withWitnesses` demand an argument of type `never`. These two casts restore
 * the shapes the library intends. The witnesses object itself is still
 * type-checked against the contract's generated `Witnesses` type in
 * `witnesses.ts`, so a genuine mismatch is caught there.
 */
export async function loadCompiledContract(): Promise<any> {
  const Counter = await loadCounterModule();

  const attachWitnesses = CompiledContract.withWitnesses as unknown as (
    w: CounterWitnesses,
  ) => <T>(self: T) => T;

  const withCompiledFileAssets = CompiledContract.withCompiledFileAssets as unknown as (
    p: string,
  ) => <T>(self: T) => T;

  const base = CompiledContract.make('counter', Counter.Contract);
  return withCompiledFileAssets(zkConfigPath)(attachWitnesses(witnesses)(base));
}

import { defineConfig } from 'vitest/config';

// Vitest configuration for the WanningGate test suite.
//
// The 8 tests in tests/counter.test.ts execute the compiled Compact contract
// entirely in-process through compact-runtime — no Docker, no proof server,
// no wallet, no network connection needed.
//
// testTimeout: 10 000 ms gives CI runners headroom while still failing fast if
// an accidental async hang occurs (e.g. a promise that never resolves).
//
// reporters: 'verbose' prints every test name + duration in the CI log, making
// the Level 1 terminal screenshot self-documenting.
//
// pool: 'forks' runs each test file in its own Node.js process, preventing
// any global state in compact-runtime from bleeding between suites if more
// test files are added in future.

export default defineConfig({
  test: {
    // Only pick up tests under tests/ — avoids accidentally running files
    // inside managed/ or node_modules that happen to match *.test.*
    include: ['tests/**/*.test.ts'],

    // compact-runtime is a pure Node module; no DOM or browser APIs needed.
    environment: 'node',

    // Safety net against async hangs. In-process circuit execution is well
    // under 1 s; this is a ceiling, not a target.
    testTimeout: 10_000,

    // Print each test name + result in CI logs and terminal screenshots.
    reporters: ['verbose'],

    // Each test file gets its own Node process.
    pool: 'forks',
  },
});

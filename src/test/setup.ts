// ─── Global Test Setup ───────────────────────────────────────────────────────
// Configures the test environment for all Vitest tests.

import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';

// ---------------------------------------------------------------------------
// MSW (Mock Service Worker) server setup - available for API tests
// ---------------------------------------------------------------------------

// Clean up after each test
afterEach(() => {
  // Reset any runtime handlers tests may add
});

// Global teardown
afterAll(() => {
  // Cleanup any remaining resources
});

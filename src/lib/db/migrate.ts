// ---------------------------------------------------------------------------
// CallDoc - Drizzle Migration Runner
//
// Runs all pending migrations from the drizzle/ folder against the
// configured PostgreSQL database. Can be executed:
//   - On startup (imported by bootstrap.ts)
//   - Manually: npx tsx src/lib/db/migrate.ts
// ---------------------------------------------------------------------------

import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

/**
 * Run all pending database migrations.
 *
 * @param databaseUrl - PostgreSQL connection URL. Defaults to DATABASE_URL env var.
 * @param migrationsFolder - Path to the migrations folder. Defaults to './drizzle'.
 */
export async function runMigrations(
  databaseUrl?: string,
  migrationsFolder?: string
): Promise<void> {
  const url = databaseUrl ?? process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Provide it as an environment variable or pass it to runMigrations().'
    );
  }

  const folder = migrationsFolder ?? './drizzle';

  log(`Running migrations from ${folder}...`);

  // Create a dedicated connection for migrations with max 1 connection
  const migrationClient = postgres(url, { max: 1 });
  const migrationDb = drizzle(migrationClient);

  try {
    await migrate(migrationDb, { migrationsFolder: folder });
    log('Migrations completed successfully');
  } catch (err) {
    log(`Migration failed: ${err instanceof Error ? err.message : err}`);
    throw err;
  } finally {
    await migrationClient.end();
  }
}

// ---------------------------------------------------------------------------
// CLI Entry Point
// ---------------------------------------------------------------------------

// When run directly (npx tsx src/lib/db/migrate.ts), execute migrations
const isMainModule =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  (process.argv[1].endsWith('migrate.ts') || process.argv[1].endsWith('migrate.js'));

if (isMainModule) {
  runMigrations()
    .then(() => {
      log('Migration runner complete');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration runner failed:', err);
      process.exit(1);
    });
}

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

function log(message: string): void {
  console.log(`[${new Date().toISOString()}] [Migrate] ${message}`);
}

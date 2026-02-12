import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

// Pool configuration: The correlation engine, SMDR writer, Socket.io bridge,
// and API routes all hit PostgreSQL concurrently, so explicit pool tuning is
// critical to avoid connection exhaustion under load.
const poolMax = parseInt(process.env.DB_POOL_MAX ?? '20', 10);
const idleTimeout = parseInt(process.env.DB_IDLE_TIMEOUT ?? '30000', 10);

const client = postgres(connectionString, {
  max: poolMax,
  idle_timeout: Math.floor(idleTimeout / 1000), // postgres.js expects seconds
  connect_timeout: 10,                           // 10 seconds
  max_lifetime: 60 * 30,                         // 30 minutes max connection lifetime
  prepare: true,                                 // use prepared statements for performance
});

export const db = drizzle(client, { schema });

/**
 * Database — Drizzle client instance for PostgreSQL.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
import { config } from '../config.js';
// Supabase (and most managed Postgres) require TLS; local dev does not.
const isLocalDb = /@(localhost|127\.0\.0\.1)[:/]/.test(config.DATABASE_URL);
const client = postgres(config.DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: isLocalDb ? false : 'require',
    // Supabase's transaction-mode pooler (port 6543) does not support prepared
    // statements; disabling them keeps the app working on any Supabase mode.
    prepare: false,
});
export const db = drizzle(client, { schema });
/**
 * Verify DB connection on startup.
 */
export async function initDb() {
    try {
        await client `SELECT 1`;
        console.log('[DB] Connected to PostgreSQL successfully.');
    }
    catch (e) {
        console.error(`[DB] WARNING: Could not connect to database: ${e}`);
        console.log('[DB] The server will start, but database features will fail until connected.');
    }
}
/**
 * Dispose the connection pool on shutdown.
 */
export async function closeDb() {
    await client.end();
}
//# sourceMappingURL=index.js.map
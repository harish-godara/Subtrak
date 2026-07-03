/**
 * Database — Drizzle client instance for PostgreSQL.
 */
import postgres from 'postgres';
import * as schema from './schema.js';
export declare const db: import("drizzle-orm/postgres-js").PostgresJsDatabase<typeof schema> & {
    $client: postgres.Sql<{}>;
};
/**
 * Verify DB connection on startup.
 */
export declare function initDb(): Promise<void>;
/**
 * Dispose the connection pool on shutdown.
 */
export declare function closeDb(): Promise<void>;
//# sourceMappingURL=index.d.ts.map
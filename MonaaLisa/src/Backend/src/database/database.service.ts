import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';
import type { DB } from './schema';

/**
 * Longest a single query may run. Some searches take Postgres many seconds
 * (a common word in the abstracts, sorted by date), and a few of them at once
 * would hold every connection of the pool. The slowest ordinary request, a
 * map of 20,000 papers, takes about 5 s on the server.
 */
export const STATEMENT_TIMEOUT_MS = Number(
  process.env.DB_STATEMENT_TIMEOUT_MS ?? 15_000,
);

/**
 * Typed query builder for the database (Kysely). The table types in
 * schema.ts are generated from the real database, see `npm run db:types`.
 * The schema itself is owned by the SQL migrations in /db/migrations.
 */
@Injectable()
export class DatabaseService extends Kysely<DB> implements OnModuleDestroy {
  constructor() {
    super({
      dialect: new PostgresDialect({
        pool: new Pool({
          connectionString: process.env.DATABASE_URL,
          statement_timeout: STATEMENT_TIMEOUT_MS,
        }),
      }),
    });
  }

  /** Throws when the database cannot be reached */
  async ping(): Promise<void> {
    await sql`SELECT 1`.execute(this);
  }

  async onModuleDestroy() {
    await this.destroy();
  }
}

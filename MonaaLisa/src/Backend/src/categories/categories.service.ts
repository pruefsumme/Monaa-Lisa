import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../database/database.service';

export interface CategoryCount {
  /** arXiv category, e.g. "cs.LG" */
  id: string;
  /** Papers listed in the category, cross listed ones included */
  papers: number;
  /** Papers that have it as their primary (first) category */
  primary: number;
}

/** Counting reads the whole paper table, the answer is kept this long */
const KEEP_MS = 60 * 60 * 1000;

/**
 * How many papers of the dataset every arXiv category holds.
 * Counting takes seconds (the whole 10 GB paper table), and the start page
 * waits for it. So the count starts when the server starts, and an answer
 * older than KEEP_MS is still given while a new count runs in the background.
 */
@Injectable()
export class CategoriesService implements OnApplicationBootstrap {
  constructor(private readonly db: DatabaseService) {}

  private kept: { at: number; counts: Promise<CategoryCount[]> } | null = null;
  private recounting = false;

  onApplicationBootstrap() {
    // not in tests, they fill in their own papers after the start
    if (process.env.NODE_ENV === 'production') {
      this.counts().catch(() => undefined);
    }
  }

  counts(): Promise<CategoryCount[]> {
    if (!this.kept) {
      const counts = this.count();
      this.kept = { at: Date.now(), counts };
      // a failed count is not kept, the next request tries again
      counts.catch(() => (this.kept = null));
    } else if (Date.now() - this.kept.at > KEEP_MS && !this.recounting) {
      this.recounting = true;
      const counts = this.count();
      counts
        .then(() => (this.kept = { at: Date.now(), counts }))
        .catch(() => undefined) // keeps the old answer, tries again later
        .finally(() => (this.recounting = false));
    }
    return this.kept.counts;
  }

  private async count(): Promise<CategoryCount[]> {
    const { rows } = await sql<CategoryCount>`
      SELECT c.id,
             COUNT(*)::int AS papers,
             COUNT(*) FILTER (WHERE c.position = 1)::int AS "primary"
      FROM paper p,
           unnest(string_to_array(trim(p.categories), ' ')) WITH ORDINALITY AS c(id, position)
      WHERE p.categories IS NOT NULL AND c.id <> ''
      GROUP BY c.id
      ORDER BY papers DESC`.execute(this.db);
    return rows;
  }
}

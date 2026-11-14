-- migrate:up
-- Newest first (sort=published) orders by `published DESC NULLS LAST, id`.
-- paper_published_idx is `published DESC`, which Postgres keeps NULLS FIRST,
-- so it could not give that order: every match was sorted instead. A filter
-- with many matches (a common word in the abstracts) took 4 to 18 s, with
-- this index it takes milliseconds. paper_published_idx stays, oldest first
-- and the first and last year use it.
CREATE INDEX IF NOT EXISTS paper_published_order_idx
    ON paper (published DESC NULLS LAST, id);

-- migrate:down
DROP INDEX IF EXISTS paper_published_order_idx;

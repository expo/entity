/**
 * Search strategy for SQL-based pagination.
 */
export enum PaginationStrategy {
  /**
   * Standard pagination with ORDER BY. Results are ordered by the specified orderBy fields, with ID field automatically included for stable pagination if not already present.
   */
  STANDARD = 'standard',

  /**
   * Case-insensitive pattern matching search using SQL ILIKE operator.
   * Results are ordered by the fields being searched within in the order specified, then by ID for tie-breaking and stable pagination.
   */
  ILIKE_SEARCH = 'ilike-search',

  /**
   * Similarity search using PostgreSQL trigram similarity. Results are ordered by exact match priority, then by similarity score, then by specified extra order by fields if provided, then by ID for tie-breaking and stable pagination.
   *
   * Performance considerations:
   * - Trigram search can be significantly slower than ILIKE search, especially on large datasets without appropriate indexes.
   * - Consider using ILIKE search for smaller datasets or when exact substring matching is sufficient
   * - For larger datasets, ensure proper indexing or consider dedicated full-text search solutions.
   * - For optimal performance, create GIN or GIST indexes on searchable columns:
   * ```sql
   *   CREATE EXTENSION IF NOT EXISTS pg_trgm;
   *   CREATE INDEX idx_table_field_trigram ON table_name USING gin(field_name gin_trgm_ops);
   *   -- Or for multiple columns:
   *   CREATE INDEX idx_table_search ON table_name USING gin((field1 || ' ' || field2) gin_trgm_ops);
   * ```
   */
  TRIGRAM_SEARCH = 'trigram',
}

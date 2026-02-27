/**
 * Supported SQL value types that can be safely parameterized.
 * This ensures type safety and prevents passing unsupported types to SQL queries.
 */
export type SupportedSQLValue =
  | string
  | number
  | boolean
  | null
  | Date
  | Buffer
  | bigint
  | undefined // Will be treated as NULL
  | readonly SupportedSQLValue[] // For IN clauses and array types
  | Readonly<{ [key: string]: unknown }>; // For JSON/JSONB columns

/**
 * Types of bindings that can be used in SQL queries.
 */
export type SQLBinding =
  | { type: 'value'; value: SupportedSQLValue }
  | { type: 'identifier'; name: string };

/**
 * SQL Fragment class that safely handles parameterized queries.
 */
export class SQLFragment {
  constructor(
    public readonly sql: string,
    public readonly bindings: readonly SQLBinding[],
  ) {}

  /**
   * Get bindings in the format expected by Knex.
   * Knex expects a flat array where both identifiers and values are mixed in order.
   */
  getKnexBindings(): readonly (string | SupportedSQLValue)[] {
    return this.bindings.map((b) => {
      if (b.type === 'identifier') {
        return b.name;
      } else {
        return b.value;
      }
    });
  }

  /**
   * Combine SQL fragments
   */
  append(other: SQLFragment): SQLFragment {
    return joinSQLFragments([this, other], ' ');
  }

  /**
   * Join multiple SQL fragments with a comma separator.
   * Useful for combining column lists, value lists, etc.
   *
   * @param fragments - Array of SQL fragments to join
   * @returns - A new SQLFragment with the fragments joined by a comma and space
   */
  static joinWithCommaSeparator(...fragments: readonly SQLFragment[]): SQLFragment {
    return joinSQLFragments(fragments, ', ');
  }

  /**
   * Concatenate multiple SQL fragments with space separator.
   * Useful for combining SQL clauses like WHERE, ORDER BY, etc.
   *
   * @example
   * ```ts
   * const where = sql`WHERE age > ${18}`;
   * const orderBy = sql`ORDER BY name`;
   * const query = SQLFragment.concat(sql`SELECT * FROM users`, where, orderBy);
   * // Generates: "SELECT * FROM users WHERE age > ? ORDER BY name"
   * ```
   */
  static concat(...fragments: readonly SQLFragment[]): SQLFragment {
    return joinSQLFragments(fragments, ' ');
  }

  /**
   * Get a debug representation of the query with values inline
   * WARNING: This is for debugging only. Never execute the returned string directly.
   */
  getDebugString(): string {
    let debugString = this.sql;
    let bindingIndex = 0;

    // Replace ?? and ? placeholders with actual values for debugging
    debugString = debugString.replace(/\?\?|\?/g, (match) => {
      if (bindingIndex >= this.bindings.length) {
        return match;
      }
      const binding = this.bindings[bindingIndex];
      if (!binding) {
        return match;
      }
      bindingIndex++;

      if (match === '??' && binding.type === 'identifier') {
        // For identifiers, show them quoted as they would appear
        return `"${binding.name.replace(/"/g, '""')}"`;
      } else if (match === '?' && binding.type === 'value') {
        return SQLFragment.formatDebugValue(binding.value);
      } else {
        // Mismatch between placeholder type and binding type
        return match;
      }
    });

    return debugString;
  }

  /**
   * Format a value for debug output based on its type.
   * Handles all SupportedSQLValue types.
   */
  private static formatDebugValue(value: SupportedSQLValue): string {
    // Handle null and undefined
    if (value === null || value === undefined) {
      return 'NULL';
    }

    // Handle primitives
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`;
    }
    if (typeof value === 'number' || typeof value === 'bigint') {
      return String(value);
    }
    if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE';
    }

    // Handle Date
    if (value instanceof Date) {
      return `'${value.toISOString()}'`;
    }

    // Handle Buffer
    if (Buffer.isBuffer(value)) {
      return `'\\x${value.toString('hex')}'`;
    }

    // Handle arrays (for IN clauses or array columns)
    if (Array.isArray(value)) {
      return `ARRAY[${value.map((v) => this.formatDebugValue(v)).join(', ')}]`;
    }

    // Handle objects (for JSON/JSONB columns)
    if (typeof value === 'object' && SQLFragment.isPlainObjectForDebug(value)) {
      return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
    }

    // Fallback (should never reach here with SupportedSQLValue but because this is used
    // for debugging, there might be other values that we want to know about)
    return `UnsupportedSQLValue[${String(value)}]`;
  }

  private static isPlainObjectForDebug(obj: object): boolean {
    const proto = Object.getPrototypeOf(obj);
    // Ensure it doesn't have a custom prototype (like a class would)
    if (proto === null) {
      return true; // Created via Object.create(null)
    }
    // Check if constructor is the base Object function
    return proto.constructor === Object;
  }
}

/**
 * Helper for SQL identifiers (table/column names).
 * Stores the raw identifier name to be escaped by Knex using ?? placeholder.
 */
export class SQLIdentifier {
  constructor(public readonly name: string) {}
}

/**
 * Helper for raw SQL that should not be parameterized
 * WARNING: Only use this with trusted input to avoid SQL injection
 */
export class SQLUnsafeRaw {
  constructor(public readonly rawSql: string) {}
}

/**
 * Create a SQL identifier (table/column name) that will be escaped by Knex using ??.
 * The escaping is delegated to Knex which will handle it based on the database type.
 *
 * @example
 * ```ts
 * identifier('users') // Will be escaped as "users" in PostgreSQL
 * identifier('my"table') // Will be escaped as "my""table" in PostgreSQL
 * identifier('column"; DROP TABLE users; --') // Will be safely escaped
 * ```
 */
export function identifier(name: string): SQLIdentifier {
  return new SQLIdentifier(name);
}

/**
 * Insert raw SQL that will not be parameterized
 * WARNING: This bypasses SQL injection protection. Only use with trusted input.
 *
 * @example
 * ```ts
 * // Dynamic column names
 * const sortColumn = 'created_at';
 * const query = sql`ORDER BY ${unsafeRaw(sortColumn)} DESC`;
 *
 * // Dynamic SQL expressions
 * const query = sql`WHERE ${unsafeRaw('EXTRACT(year FROM created_at)')} = ${2024}`;
 * ```
 */
export function unsafeRaw(sqlString: string): SQLUnsafeRaw {
  return new SQLUnsafeRaw(sqlString);
}

/**
 * Tagged template literal function for SQL queries
 *
 * @example
 * ```ts
 * const age = 18;
 * const query = sql`age >= ${age} AND status = ${'active'}`;
 * ```
 */
export function sql(
  strings: TemplateStringsArray,
  ...values: readonly (SupportedSQLValue | SQLFragment | SQLIdentifier | SQLUnsafeRaw)[]
): SQLFragment {
  let sqlString = '';
  const bindings: SQLBinding[] = [];

  strings.forEach((string, i) => {
    sqlString += string;
    if (i < values.length) {
      const value = values[i];

      if (value instanceof SQLFragment) {
        // Handle nested SQL fragments
        sqlString += value.sql;
        bindings.push(...value.bindings);
      } else if (value instanceof SQLIdentifier) {
        // Handle identifiers (table/column names) with ?? placeholder
        sqlString += '??';
        bindings.push({ type: 'identifier', name: value.name });
      } else if (value instanceof SQLUnsafeRaw) {
        // Handle raw SQL (WARNING: no parameterization)
        sqlString += value.rawSql;
      } else if (Array.isArray(value)) {
        // Handle IN clauses
        sqlString += `(${value.map(() => '?').join(', ')})`;
        bindings.push(...value.map((v) => ({ type: 'value' as const, value: v })));
      } else {
        // Regular value binding
        sqlString += '?';
        bindings.push({ type: 'value', value });
      }
    }
  });

  return new SQLFragment(sqlString, bindings);
}

/**
 * Common SQL helper functions for building queries
 */
export const SQLFragmentHelpers = {
  /**
   * IN clause helper
   *
   * @example
   * ```ts
   * const query = SQLFragmentHelpers.inArray('status', ['active', 'pending']);
   * // Generates: ?? IN (?, ?) with bindings ['status', 'active', 'pending']
   * ```
   */
  inArray<T extends SupportedSQLValue>(column: string, values: readonly T[]): SQLFragment {
    if (values.length === 0) {
      // Handle empty array case - always false
      return sql`1 = 0`;
    }
    // The array is already correctly typed, just needs to be seen as SupportedSQLValue for the template
    return sql`${identifier(column)} IN ${values as readonly SupportedSQLValue[]}`;
  },

  /**
   * NOT IN clause helper
   */
  notInArray<T extends SupportedSQLValue>(column: string, values: readonly T[]): SQLFragment {
    if (values.length === 0) {
      // Handle empty array case - always true
      return sql`1 = 1`;
    }
    return sql`${identifier(column)} NOT IN ${values as readonly SupportedSQLValue[]}`;
  },

  /**
   * BETWEEN helper
   *
   * @example
   * ```ts
   * const query = SQLFragmentHelpers.between('age', 18, 65);
   * // Generates: "age" BETWEEN ? AND ? with values [18, 65]
   * ```
   */
  between<T extends string | number | Date>(column: string, min: T, max: T): SQLFragment {
    return sql`${identifier(column)} BETWEEN ${min} AND ${max}`;
  },

  /**
   * NOT BETWEEN helper
   */
  notBetween<T extends string | number | Date>(column: string, min: T, max: T): SQLFragment {
    return sql`${identifier(column)} NOT BETWEEN ${min} AND ${max}`;
  },

  /**
   * LIKE helper with automatic escaping
   *
   * @example
   * ```ts
   * const query = SQLFragmentHelpers.like('name', '%John%');
   * // Generates: "name" LIKE ? with value '%John%'
   * ```
   */
  like(column: string, pattern: string): SQLFragment {
    return sql`${identifier(column)} LIKE ${pattern}`;
  },

  /**
   * NOT LIKE helper
   */
  notLike(column: string, pattern: string): SQLFragment {
    return sql`${identifier(column)} NOT LIKE ${pattern}`;
  },

  /**
   * ILIKE helper for case-insensitive matching
   */
  ilike(column: string, pattern: string): SQLFragment {
    return sql`${identifier(column)} ILIKE ${pattern}`;
  },

  /**
   * NOT ILIKE helper for case-insensitive non-matching
   */
  notIlike(column: string, pattern: string): SQLFragment {
    return sql`${identifier(column)} NOT ILIKE ${pattern}`;
  },

  /**
   * NULL check helper
   */
  isNull(column: string): SQLFragment {
    return sql`${identifier(column)} IS NULL`;
  },

  /**
   * NOT NULL check helper
   */
  isNotNull(column: string): SQLFragment {
    return sql`${identifier(column)} IS NOT NULL`;
  },

  /**
   * Single-equals-equality operator
   */
  eq(column: string, value: SupportedSQLValue): SQLFragment {
    if (value === null || value === undefined) {
      return SQLFragmentHelpers.isNull(column);
    }
    return sql`${identifier(column)} = ${value}`;
  },

  /**
   * Single-equals-inequality operator
   */
  neq(column: string, value: SupportedSQLValue): SQLFragment {
    if (value === null || value === undefined) {
      return SQLFragmentHelpers.isNotNull(column);
    }
    return sql`${identifier(column)} != ${value}`;
  },

  /**
   * Greater-than comparison operator
   */
  gt(column: string, value: SupportedSQLValue): SQLFragment {
    return sql`${identifier(column)} > ${value}`;
  },

  /**
   * Greater-than-or-equal-to comparison operator
   */
  gte(column: string, value: SupportedSQLValue): SQLFragment {
    return sql`${identifier(column)} >= ${value}`;
  },

  /**
   * Less-than comparison operator
   */
  lt(column: string, value: SupportedSQLValue): SQLFragment {
    return sql`${identifier(column)} < ${value}`;
  },

  /**
   * Less-than-or-equal-to comparison operator
   */
  lte(column: string, value: SupportedSQLValue): SQLFragment {
    return sql`${identifier(column)} <= ${value}`;
  },

  /**
   * JSON contains operator (\@\>)
   */
  jsonContains(column: string, value: unknown): SQLFragment {
    return sql`${identifier(column)} @> ${JSON.stringify(value)}::jsonb`;
  },

  /**
   * JSON contained by operator (\<\@\)
   */
  jsonContainedBy(column: string, value: unknown): SQLFragment {
    return sql`${identifier(column)} <@ ${JSON.stringify(value)}::jsonb`;
  },

  /**
   * JSON path extraction helper (-\>)
   */
  jsonPath(column: string, path: string): SQLFragment {
    return sql`${identifier(column)}->${path}`;
  },

  /**
   * JSON path text extraction helper (-\>\>)
   */
  jsonPathText(column: string, path: string): SQLFragment {
    return sql`${identifier(column)}->>${path}`;
  },

  /**
   * Logical AND of multiple fragments
   */
  and(...conditions: readonly SQLFragment[]): SQLFragment {
    if (conditions.length === 0) {
      return sql`1 = 1`;
    }
    return joinSQLFragments(
      conditions.map((c) => SQLFragmentHelpers.group(c)),
      ' AND ',
    );
  },

  /**
   * Logical OR of multiple fragments
   */
  or(...conditions: readonly SQLFragment[]): SQLFragment {
    if (conditions.length === 0) {
      return sql`1 = 0`;
    }
    return joinSQLFragments(
      conditions.map((c) => SQLFragmentHelpers.group(c)),
      ' OR ',
    );
  },

  /**
   * Logical NOT of a fragment
   */
  not(condition: SQLFragment): SQLFragment {
    return new SQLFragment('NOT (' + condition.sql + ')', condition.bindings);
  },

  /**
   * Parentheses helper for grouping conditions
   */
  group(condition: SQLFragment): SQLFragment {
    return new SQLFragment('(' + condition.sql + ')', condition.bindings);
  },
};

// Internal helper function to join SQL fragments with a specified separator
function joinSQLFragments(fragments: readonly SQLFragment[], separator: string): SQLFragment {
  return new SQLFragment(
    fragments.map((f) => f.sql).join(separator),
    fragments.flatMap((f) => f.bindings),
  );
}

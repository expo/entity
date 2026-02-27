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
export type SQLBinding<TFields extends Record<string, any>> =
  | { type: 'value'; value: SupportedSQLValue }
  | { type: 'identifier'; name: string }
  | { type: 'entityField'; fieldName: keyof TFields };

/**
 * SQL Fragment class that safely handles parameterized queries.
 */
export class SQLFragment<TFields extends Record<string, any>> {
  constructor(
    public readonly sql: string,
    public readonly bindings: readonly SQLBinding<TFields>[],
  ) {}

  /**
   * Get bindings in the format expected by Knex.
   * Knex expects a flat array where both identifiers and values are mixed in order.
   *
   * @param getColumnForField - function that resolves an entity field name to its database column name
   */
  getKnexBindings(
    getColumnForField: (fieldName: keyof TFields) => string,
  ): readonly (string | SupportedSQLValue)[] {
    return this.bindings.map((b) => {
      switch (b.type) {
        case 'entityField':
          return getColumnForField(b.fieldName);
        case 'identifier':
          return b.name;
        case 'value':
          return b.value;
      }
    });
  }

  /**
   * Combine SQL fragments
   */
  append(other: SQLFragment<TFields>): SQLFragment<TFields> {
    return joinSQLFragments([this, other], ' ');
  }

  /**
   * Join multiple SQL fragments with a comma separator.
   * Useful for combining column lists, value lists, etc.
   *
   * @param fragments - Array of SQL fragments to join
   * @returns - A new SQLFragment with the fragments joined by a comma and space
   */
  static joinWithCommaSeparator<TFields extends Record<string, any>>(
    ...fragments: readonly SQLFragment<TFields>[]
  ): SQLFragment<TFields> {
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
  static concat<TFields extends Record<string, any>>(
    ...fragments: readonly SQLFragment<TFields>[]
  ): SQLFragment<TFields> {
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
      } else if (match === '??' && binding.type === 'entityField') {
        // For entity fields, show the entity field name as the identifier for debugging
        return `"${binding.fieldName.toString()}"`;
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
 * Helper for referencing entity fields that can be used in SQL queries. This allows for type-safe references to fields of an entity
 * and does automatic translation to DB field names.
 */
export class SQLEntityField<TFields extends Record<string, any>> {
  constructor(public readonly fieldName: keyof TFields) {}
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
 * Create a reference to an entity field that can be used in SQL queries. This allows for type-safe references to fields of an entity
 * and does automatic translation to DB field names and will be escaped by Knex using ??.
 *
 * @param fieldName - The entity field name to reference.
 */
export function entityField<TFields extends Record<string, any>>(
  fieldName: keyof TFields,
): SQLEntityField<TFields> {
  return new SQLEntityField(fieldName);
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
export function sql<TFields extends Record<string, any>>(
  strings: TemplateStringsArray,
  ...values: readonly (
    | SupportedSQLValue
    | SQLFragment<TFields>
    | SQLIdentifier
    | SQLUnsafeRaw
    | SQLEntityField<TFields>
  )[]
): SQLFragment<TFields> {
  let sqlString = '';
  const bindings: SQLBinding<TFields>[] = [];

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
      } else if (value instanceof SQLEntityField) {
        // Handle entity field references by treating them as identifiers
        sqlString += '??';
        bindings.push({ type: 'entityField', fieldName: value.fieldName });
      } else if (value instanceof SQLUnsafeRaw) {
        // Handle raw SQL (WARNING: no parameterization)
        sqlString += value.rawSql;
      } else if (Array.isArray(value)) {
        // Handle IN clauses
        sqlString += `(${value.map(() => '?').join(', ')})`;
        bindings.push(...value.map((v): SQLBinding<TFields> => ({ type: 'value', value: v })));
      } else {
        // Regular value binding
        sqlString += '?';
        bindings.push({ type: 'value', value });
      }
    }
  });

  return new SQLFragment(sqlString, bindings);
}

type PickSupportedSQLValueKeys<T> = {
  [K in keyof T]: T[K] extends SupportedSQLValue ? K : never;
}[keyof T];

/**
 * Common SQL helper functions for building queries
 */
export const SQLFragmentHelpers = {
  /**
   * IN clause helper
   *
   * @example
   * ```ts
   * const query = SQLFragmentHelpers.inArray<MyFields, 'id'>('status', ['active', 'pending']);
   * // Generates: ?? IN (?, ?) with entityField binding for 'status' and value bindings
   * ```
   */
  inArray<TFields extends Record<string, any>, N extends PickSupportedSQLValueKeys<TFields>>(
    fieldName: N,
    values: readonly TFields[N][],
  ): SQLFragment<TFields> {
    if (values.length === 0) {
      // Handle empty array case - always false
      return sql`1 = 0`;
    }
    return sql`${entityField(fieldName)} IN ${values}`;
  },

  /**
   * NOT IN clause helper
   */
  notInArray<TFields extends Record<string, any>, N extends PickSupportedSQLValueKeys<TFields>>(
    fieldName: N,
    values: readonly TFields[N][],
  ): SQLFragment<TFields> {
    if (values.length === 0) {
      // Handle empty array case - always true
      return sql`1 = 1`;
    }
    return sql`${entityField(fieldName)} NOT IN ${values}`;
  },

  /**
   * BETWEEN helper
   *
   * @example
   * ```ts
   * const query = SQLFragmentHelpers.between<MyFields, 'id'>('age', 18, 65);
   * // Generates: ?? BETWEEN ? AND ? with entityField binding for 'age' and value bindings
   * ```
   */
  between<TFields extends Record<string, any>, N extends PickSupportedSQLValueKeys<TFields>>(
    fieldName: N,
    min: TFields[N],
    max: TFields[N],
  ): SQLFragment<TFields> {
    return sql`${entityField(fieldName)} BETWEEN ${min} AND ${max}`;
  },

  /**
   * NOT BETWEEN helper
   */
  notBetween<TFields extends Record<string, any>, N extends PickSupportedSQLValueKeys<TFields>>(
    fieldName: N,
    min: TFields[N],
    max: TFields[N],
  ): SQLFragment<TFields> {
    return sql`${entityField(fieldName)} NOT BETWEEN ${min} AND ${max}`;
  },

  /**
   * LIKE helper with automatic escaping
   *
   * @example
   * ```ts
   * const query = SQLFragmentHelpers.like<MyFields, 'id'>('name', '%John%');
   * // Generates: ?? LIKE ? with entityField binding for 'name' and value binding
   * ```
   */
  like<TFields extends Record<string, any>>(
    fieldName: keyof TFields,
    pattern: string,
  ): SQLFragment<TFields> {
    return sql`${entityField(fieldName)} LIKE ${pattern}`;
  },

  /**
   * NOT LIKE helper
   */
  notLike<TFields extends Record<string, any>>(
    fieldName: keyof TFields,
    pattern: string,
  ): SQLFragment<TFields> {
    return sql`${entityField(fieldName)} NOT LIKE ${pattern}`;
  },

  /**
   * ILIKE helper for case-insensitive matching
   */
  ilike<TFields extends Record<string, any>>(
    fieldName: keyof TFields,
    pattern: string,
  ): SQLFragment<TFields> {
    return sql`${entityField(fieldName)} ILIKE ${pattern}`;
  },

  /**
   * NOT ILIKE helper for case-insensitive non-matching
   */
  notIlike<TFields extends Record<string, any>>(
    fieldName: keyof TFields,
    pattern: string,
  ): SQLFragment<TFields> {
    return sql`${entityField(fieldName)} NOT ILIKE ${pattern}`;
  },

  /**
   * NULL check helper
   */
  isNull<TFields extends Record<string, any>>(fieldName: keyof TFields): SQLFragment<TFields> {
    return sql`${entityField(fieldName)} IS NULL`;
  },

  /**
   * NOT NULL check helper
   */
  isNotNull<TFields extends Record<string, any>>(fieldName: keyof TFields): SQLFragment<TFields> {
    return sql`${entityField(fieldName)} IS NOT NULL`;
  },

  /**
   * Single-equals-equality operator
   */
  eq<TFields extends Record<string, any>, N extends PickSupportedSQLValueKeys<TFields>>(
    fieldName: N,
    value: TFields[N],
  ): SQLFragment<TFields> {
    if (value === null || value === undefined) {
      return SQLFragmentHelpers.isNull(fieldName);
    }
    return sql`${entityField(fieldName)} = ${value}`;
  },

  /**
   * Single-equals-inequality operator
   */
  neq<TFields extends Record<string, any>, N extends PickSupportedSQLValueKeys<TFields>>(
    fieldName: N,
    value: TFields[N],
  ): SQLFragment<TFields> {
    if (value === null || value === undefined) {
      return SQLFragmentHelpers.isNotNull(fieldName);
    }
    return sql`${entityField(fieldName)} != ${value}`;
  },

  /**
   * Greater-than comparison operator
   */
  gt<TFields extends Record<string, any>, N extends PickSupportedSQLValueKeys<TFields>>(
    fieldName: N,
    value: TFields[N],
  ): SQLFragment<TFields> {
    return sql`${entityField(fieldName)} > ${value}`;
  },

  /**
   * Greater-than-or-equal-to comparison operator
   */
  gte<TFields extends Record<string, any>, N extends PickSupportedSQLValueKeys<TFields>>(
    fieldName: N,
    value: TFields[N],
  ): SQLFragment<TFields> {
    return sql`${entityField(fieldName)} >= ${value}`;
  },

  /**
   * Less-than comparison operator
   */
  lt<TFields extends Record<string, any>, N extends PickSupportedSQLValueKeys<TFields>>(
    fieldName: N,
    value: TFields[N],
  ): SQLFragment<TFields> {
    return sql`${entityField(fieldName)} < ${value}`;
  },

  /**
   * Less-than-or-equal-to comparison operator
   */
  lte<TFields extends Record<string, any>, N extends PickSupportedSQLValueKeys<TFields>>(
    fieldName: N,
    value: TFields[N],
  ): SQLFragment<TFields> {
    return sql`${entityField(fieldName)} <= ${value}`;
  },

  /**
   * JSON contains operator (\@\>)
   */
  jsonContains<TFields extends Record<string, any>>(
    fieldName: keyof TFields,
    value: unknown,
  ): SQLFragment<TFields> {
    return sql`${entityField(fieldName)} @> ${JSON.stringify(value)}::jsonb`;
  },

  /**
   * JSON contained by operator (\<\@\)
   */
  jsonContainedBy<TFields extends Record<string, any>>(
    fieldName: keyof TFields,
    value: unknown,
  ): SQLFragment<TFields> {
    return sql`${entityField(fieldName)} <@ ${JSON.stringify(value)}::jsonb`;
  },

  /**
   * JSON path extraction helper (-\>)
   */
  jsonPath<TFields extends Record<string, any>>(
    fieldName: keyof TFields,
    path: string,
  ): SQLFragment<TFields> {
    return sql`${entityField(fieldName)}->${path}`;
  },

  /**
   * JSON path text extraction helper (-\>\>)
   */
  jsonPathText<TFields extends Record<string, any>>(
    fieldName: keyof TFields,
    path: string,
  ): SQLFragment<TFields> {
    return sql`${entityField(fieldName)}->>${path}`;
  },

  /**
   * Logical AND of multiple fragments
   */
  and<TFields extends Record<string, any>>(
    ...conditions: readonly SQLFragment<TFields>[]
  ): SQLFragment<TFields> {
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
  or<TFields extends Record<string, any>>(
    ...conditions: readonly SQLFragment<TFields>[]
  ): SQLFragment<TFields> {
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
  not<TFields extends Record<string, any>>(condition: SQLFragment<TFields>): SQLFragment<TFields> {
    return new SQLFragment('NOT (' + condition.sql + ')', condition.bindings);
  },

  /**
   * Parentheses helper for grouping conditions
   */
  group<TFields extends Record<string, any>>(
    condition: SQLFragment<TFields>,
  ): SQLFragment<TFields> {
    return new SQLFragment('(' + condition.sql + ')', condition.bindings);
  },
};

// Internal helper function to join SQL fragments with a specified separator
function joinSQLFragments<TFields extends Record<string, any>>(
  fragments: readonly SQLFragment<TFields>[],
  separator: string,
): SQLFragment<TFields> {
  return new SQLFragment(
    fragments.map((f) => f.sql).join(separator),
    fragments.flatMap((f) => f.bindings),
  );
}

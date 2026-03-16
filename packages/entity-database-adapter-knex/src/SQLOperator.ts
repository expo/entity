import assert from 'assert';

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
  ): readonly SupportedSQLValue[] {
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
export class SQLEntityField<TFields extends Record<string, any>, N extends keyof TFields> {
  constructor(public readonly fieldName: N) {}
}

/**
 * Helper for passing an array as a single bound parameter (e.g. for PostgreSQL's = ANY(?)).
 * Unlike bare arrays interpolated in the sql template (which expand to (?, ?, ?) for IN clauses),
 * this binds the entire array as one parameter, letting knex handle the array encoding.
 */
export class SQLArrayValue {
  constructor(public readonly values: readonly SupportedSQLValue[]) {}
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
export function entityField<TFields extends Record<string, any>, N extends keyof TFields>(
  fieldName: N,
): SQLEntityField<TFields, N> {
  return new SQLEntityField(fieldName);
}

/**
 * Wrap an array so it is bound as a single parameter rather than expanded for IN clauses.
 * Generates PostgreSQL's = ANY(?) syntax.
 *
 * @example
 * ```ts
 * const statuses = ['active', 'pending'];
 * const query = sql`${entityField('status')} = ANY(${arrayValue(statuses)})`;
 * // Generates: ?? = ANY(?) with the array bound as a single parameter
 * ```
 */
export function arrayValue(values: readonly SupportedSQLValue[]): SQLArrayValue {
  return new SQLArrayValue(values);
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
    | SQLEntityField<TFields, keyof TFields>
    | SQLArrayValue
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
      } else if (value instanceof SQLArrayValue) {
        // Handle array as a single bound parameter (for = ANY(?), etc.)
        sqlString += '?';
        bindings.push({ type: 'value', value: value.values });
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

type PickStringValueKeys<T> = {
  [K in keyof T]: T[K] extends string | null | undefined ? K : never;
}[keyof T];

type JsonSerializable =
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly JsonSerializable[]
  | { readonly [key: string]: JsonSerializable };

/**
 * An SQL expression that supports fluent comparison methods.
 * Extends SQLFragment so it can be used anywhere a SQLFragment is accepted.
 * The fluent methods return plain SQLFragment instances since they produce
 * complete conditions, not further chainable expressions.
 */
export class SQLChainableFragment<
  TFields extends Record<string, any>,
  TValue extends SupportedSQLValue,
> extends SQLFragment<TFields> {
  /**
   * Generates an equality condition (`= value`).
   * Automatically converts `null`/`undefined` to `IS NULL`.
   *
   * @param value - The value to compare against
   * @returns A {@link SQLFragment} representing the equality condition
   */
  eq(value: TValue | null | undefined): SQLFragment<TFields> {
    if (value === null || value === undefined) {
      return this.isNull();
    }
    return sql`${this} = ${value}`;
  }

  /**
   * Generates an inequality condition (`!= value`).
   * Automatically converts `null`/`undefined` to `IS NOT NULL`.
   *
   * @param value - The value to compare against
   * @returns A {@link SQLFragment} representing the inequality condition
   */
  neq(value: TValue | null | undefined): SQLFragment<TFields> {
    if (value === null || value === undefined) {
      return this.isNotNull();
    }
    return sql`${this} != ${value}`;
  }

  /**
   * Generates a greater-than condition (`> value`).
   *
   * @param value - The value to compare against
   * @returns A {@link SQLFragment} representing the condition
   */
  gt(value: TValue): SQLFragment<TFields> {
    return sql`${this} > ${value}`;
  }

  /**
   * Generates a greater-than-or-equal-to condition (`>= value`).
   *
   * @param value - The value to compare against
   * @returns A {@link SQLFragment} representing the condition
   */
  gte(value: TValue): SQLFragment<TFields> {
    return sql`${this} >= ${value}`;
  }

  /**
   * Generates a less-than condition (`< value`).
   *
   * @param value - The value to compare against
   * @returns A {@link SQLFragment} representing the condition
   */
  lt(value: TValue): SQLFragment<TFields> {
    return sql`${this} < ${value}`;
  }

  /**
   * Generates a less-than-or-equal-to condition (`<= value`).
   *
   * @param value - The value to compare against
   * @returns A {@link SQLFragment} representing the condition
   */
  lte(value: TValue): SQLFragment<TFields> {
    return sql`${this} <= ${value}`;
  }

  /**
   * Generates an `IS NULL` condition.
   *
   * @returns A {@link SQLFragment} representing the IS NULL check
   */
  isNull(): SQLFragment<TFields> {
    return sql`${this} IS NULL`;
  }

  /**
   * Generates an `IS NOT NULL` condition.
   *
   * @returns A {@link SQLFragment} representing the IS NOT NULL check
   */
  isNotNull(): SQLFragment<TFields> {
    return sql`${this} IS NOT NULL`;
  }

  /**
   * Generates a case-sensitive `LIKE` condition for pattern matching.
   *
   * @param pattern - The LIKE pattern (use `%` for wildcards, `_` for single character)
   * @returns A {@link SQLFragment} representing the LIKE condition
   */
  like(pattern: string): SQLFragment<TFields> {
    return sql`${this} LIKE ${pattern}`;
  }

  /**
   * Generates a case-sensitive `NOT LIKE` condition.
   *
   * @param pattern - The LIKE pattern (use `%` for wildcards, `_` for single character)
   * @returns A {@link SQLFragment} representing the NOT LIKE condition
   */
  notLike(pattern: string): SQLFragment<TFields> {
    return sql`${this} NOT LIKE ${pattern}`;
  }

  /**
   * Generates a case-insensitive `ILIKE` condition (PostgreSQL-specific).
   *
   * @param pattern - The LIKE pattern (use `%` for wildcards, `_` for single character)
   * @returns A {@link SQLFragment} representing the ILIKE condition
   */
  ilike(pattern: string): SQLFragment<TFields> {
    return sql`${this} ILIKE ${pattern}`;
  }

  /**
   * Generates a case-insensitive `NOT ILIKE` condition (PostgreSQL-specific).
   *
   * @param pattern - The LIKE pattern (use `%` for wildcards, `_` for single character)
   * @returns A {@link SQLFragment} representing the NOT ILIKE condition
   */
  notIlike(pattern: string): SQLFragment<TFields> {
    return sql`${this} NOT ILIKE ${pattern}`;
  }

  /**
   * Generates an `IN (...)` condition. Each array element becomes a separate
   * bound parameter (`IN (?, ?, ?)`).
   * Returns `FALSE` when the values array is empty.
   *
   * @param values - The values to check membership against
   * @returns A {@link SQLFragment} representing the IN condition
   */
  inArray(values: readonly TValue[]): SQLFragment<TFields> {
    if (values.length === 0) {
      return sql`FALSE`;
    }
    return sql`${this} IN ${values}`;
  }

  /**
   * Generates a `NOT IN (...)` condition. Each array element becomes a separate
   * bound parameter.
   * Returns `TRUE` when the values array is empty.
   *
   * @param values - The values to check non-membership against
   * @returns A {@link SQLFragment} representing the NOT IN condition
   */
  notInArray(values: readonly TValue[]): SQLFragment<TFields> {
    if (values.length === 0) {
      return sql`TRUE`;
    }
    return sql`${this} NOT IN ${values}`;
  }

  /**
   * Generates an `= ANY(?)` condition. Unlike {@link inArray}, the array is bound
   * as a single parameter, producing a consistent query shape for query metrics.
   * Returns `FALSE` when the values array is empty.
   *
   * @param values - The values to check membership against
   * @returns A {@link SQLFragment} representing the = ANY condition
   */
  anyArray(values: readonly TValue[]): SQLFragment<TFields> {
    if (values.length === 0) {
      return sql`FALSE`;
    }
    return sql`${this} = ANY(${arrayValue(values)})`;
  }

  /**
   * Generates a `BETWEEN min AND max` condition (inclusive on both ends).
   *
   * @param min - The lower bound
   * @param max - The upper bound
   * @returns A {@link SQLFragment} representing the BETWEEN condition
   */
  between(min: TValue, max: TValue): SQLFragment<TFields> {
    return sql`${this} BETWEEN ${min} AND ${max}`;
  }

  /**
   * Generates a `NOT BETWEEN min AND max` condition.
   *
   * @param min - The lower bound
   * @param max - The upper bound
   * @returns A {@link SQLFragment} representing the NOT BETWEEN condition
   */
  notBetween(min: TValue, max: TValue): SQLFragment<TFields> {
    return sql`${this} NOT BETWEEN ${min} AND ${max}`;
  }
}

/**
 * Allowed PostgreSQL type names for the cast() helper.
 * Only these types can be used to prevent SQL injection through type name interpolation.
 */
const ALLOWED_CAST_TYPES = [
  'int',
  'integer',
  'int2',
  'int4',
  'int8',
  'smallint',
  'bigint',
  'numeric',
  'decimal',
  'real',
  'double precision',
  'float',
  'float4',
  'float8',
  'text',
  'varchar',
  'char',
  'character varying',
  'boolean',
  'bool',
  'date',
  'time',
  'timestamp',
  'timestamptz',
  'interval',
  'json',
  'jsonb',
  'uuid',
  'bytea',
] as const;

/**
 * Allowed PostgreSQL type names for the cast() helper.
 * Only these types can be used to prevent SQL injection through type name interpolation.
 */
export type PostgresCastType = (typeof ALLOWED_CAST_TYPES)[number];

const ALLOWED_CAST_TYPES_SET: ReadonlySet<string> = new Set<PostgresCastType>(ALLOWED_CAST_TYPES);

// Helper to resolve expressionOrFieldName to a SQLFragment
function resolveInner<TFields extends Record<string, any>>(
  expressionOrFieldName: SQLFragment<TFields> | keyof TFields,
): SQLFragment<TFields> {
  return expressionOrFieldName instanceof SQLFragment
    ? expressionOrFieldName
    : sql`${entityField<TFields, keyof TFields>(expressionOrFieldName)}`;
}

// Helper to resolve expressionOrFieldName to a SQLChainableFragment for fluent chaining
function resolveInnerExpr<TFields extends Record<string, any>>(
  expressionOrFieldName: SQLFragment<TFields> | keyof TFields,
): SQLChainableFragment<TFields, SupportedSQLValue> {
  if (expressionOrFieldName instanceof SQLChainableFragment) {
    return expressionOrFieldName;
  }
  const inner = resolveInner(expressionOrFieldName);
  return new SQLChainableFragment(inner.sql, inner.bindings);
}

// --- Standalone overloaded helper functions ---
// For methods with value params, the expression overload uses a conditional type to preserve
// TValue from SQLChainableFragment (for type-safe value checking) while falling back to
// SupportedSQLValue for plain SQLFragment inputs.

// Extract TFields from a SQLFragment type
type ExtractFragmentFields<T> = T extends SQLFragment<infer F> ? F : never;

// Conditional value types for expression overloads.
// Uses SQLChainableFragment<any, ...> so that TExpr alone drives inference (single type param).
type FragmentValueNullable<TFragment> =
  TFragment extends SQLChainableFragment<any, infer TValue>
    ? TValue | null | undefined
    : SupportedSQLValue;

type FragmentValue<TFragment> =
  TFragment extends SQLChainableFragment<any, infer TValue> ? TValue : SupportedSQLValue;

type FragmentValueArray<TFragment> =
  TFragment extends SQLChainableFragment<any, infer TValue>
    ? readonly TValue[]
    : readonly SupportedSQLValue[];

/**
 * Generates an `IN (...)` condition from a fragment and array of values.
 * Each array element becomes a separate bound parameter. Returns `FALSE` for empty arrays.
 *
 * @param fragment - A SQLFragment or SQLChainableFragment to check
 * @param values - The values to check membership against
 */
function inArrayHelper<TFragment extends SQLFragment<any>>(
  fragment: TFragment,
  values: FragmentValueArray<TFragment>,
): SQLFragment<ExtractFragmentFields<TFragment>>;
/**
 * Generates an `IN (...)` condition from a field name and array of values.
 * Each array element becomes a separate bound parameter. Returns `FALSE` for empty arrays.
 *
 * @param fieldName - The entity field name to check
 * @param values - The values to check membership against
 */
function inArrayHelper<
  TFields extends Record<string, any>,
  N extends PickSupportedSQLValueKeys<TFields>,
>(fieldName: N, values: readonly TFields[N][]): SQLFragment<TFields>;
function inArrayHelper<TFields extends Record<string, any>>(
  expressionOrFieldName: SQLFragment<TFields> | keyof TFields,
  values: readonly SupportedSQLValue[],
): SQLFragment<TFields> {
  return resolveInnerExpr(expressionOrFieldName).inArray(values);
}

/**
 * Generates an `= ANY(?)` condition from a fragment and array of values.
 * The array is bound as a single parameter for consistent query shape. Returns `FALSE` for empty arrays.
 *
 * @param fragment - A SQLFragment or SQLChainableFragment to check
 * @param values - The values to check membership against
 */
function anyArrayHelper<TFragment extends SQLFragment<any>>(
  fragment: TFragment,
  values: FragmentValueArray<TFragment>,
): SQLFragment<ExtractFragmentFields<TFragment>>;
/**
 * Generates an `= ANY(?)` condition from a field name and array of values.
 * The array is bound as a single parameter for consistent query shape. Returns `FALSE` for empty arrays.
 *
 * @param fieldName - The entity field name to check
 * @param values - The values to check membership against
 */
function anyArrayHelper<
  TFields extends Record<string, any>,
  N extends PickSupportedSQLValueKeys<TFields>,
>(fieldName: N, values: readonly TFields[N][]): SQLFragment<TFields>;
function anyArrayHelper<TFields extends Record<string, any>>(
  expressionOrFieldName: SQLFragment<TFields> | keyof TFields,
  values: readonly SupportedSQLValue[],
): SQLFragment<TFields> {
  return resolveInnerExpr(expressionOrFieldName).anyArray(values);
}

/**
 * Generates a `NOT IN (...)` condition from a fragment and array of values.
 * Each array element becomes a separate bound parameter. Returns `TRUE` for empty arrays.
 *
 * @param fragment - A SQLFragment or SQLChainableFragment to check
 * @param values - The values to check non-membership against
 */
function notInArrayHelper<TFragment extends SQLFragment<any>>(
  fragment: TFragment,
  values: FragmentValueArray<TFragment>,
): SQLFragment<ExtractFragmentFields<TFragment>>;
/**
 * Generates a `NOT IN (...)` condition from a field name and array of values.
 * Each array element becomes a separate bound parameter. Returns `TRUE` for empty arrays.
 *
 * @param fieldName - The entity field name to check
 * @param values - The values to check non-membership against
 */
function notInArrayHelper<
  TFields extends Record<string, any>,
  N extends PickSupportedSQLValueKeys<TFields>,
>(fieldName: N, values: readonly TFields[N][]): SQLFragment<TFields>;
function notInArrayHelper<TFields extends Record<string, any>>(
  expressionOrFieldName: SQLFragment<TFields> | keyof TFields,
  values: readonly SupportedSQLValue[],
): SQLFragment<TFields> {
  return resolveInnerExpr(expressionOrFieldName).notInArray(values);
}

/**
 * Generates a `BETWEEN min AND max` condition (inclusive) from a fragment.
 *
 * @param fragment - A SQLFragment or SQLChainableFragment to check
 * @param min - The lower bound
 * @param max - The upper bound
 */
function betweenHelper<TFragment extends SQLFragment<any>>(
  fragment: TFragment,
  min: FragmentValue<TFragment>,
  max: FragmentValue<TFragment>,
): SQLFragment<ExtractFragmentFields<TFragment>>;
/**
 * Generates a `BETWEEN min AND max` condition (inclusive) from a field name.
 *
 * @param fieldName - The entity field name to check
 * @param min - The lower bound
 * @param max - The upper bound
 */
function betweenHelper<
  TFields extends Record<string, any>,
  N extends PickSupportedSQLValueKeys<TFields>,
>(fieldName: N, min: TFields[N], max: TFields[N]): SQLFragment<TFields>;
function betweenHelper<TFields extends Record<string, any>>(
  expressionOrFieldName: SQLFragment<TFields> | keyof TFields,
  min: SupportedSQLValue,
  max: SupportedSQLValue,
): SQLFragment<TFields> {
  return resolveInnerExpr(expressionOrFieldName).between(min, max);
}

/**
 * Generates a `NOT BETWEEN min AND max` condition from a fragment.
 *
 * @param fragment - A SQLFragment or SQLChainableFragment to check
 * @param min - The lower bound
 * @param max - The upper bound
 */
function notBetweenHelper<TFragment extends SQLFragment<any>>(
  fragment: TFragment,
  min: FragmentValue<TFragment>,
  max: FragmentValue<TFragment>,
): SQLFragment<ExtractFragmentFields<TFragment>>;
/**
 * Generates a `NOT BETWEEN min AND max` condition from a field name.
 *
 * @param fieldName - The entity field name to check
 * @param min - The lower bound
 * @param max - The upper bound
 */
function notBetweenHelper<
  TFields extends Record<string, any>,
  N extends PickSupportedSQLValueKeys<TFields>,
>(fieldName: N, min: TFields[N], max: TFields[N]): SQLFragment<TFields>;
function notBetweenHelper<TFields extends Record<string, any>>(
  expressionOrFieldName: SQLFragment<TFields> | keyof TFields,
  min: SupportedSQLValue,
  max: SupportedSQLValue,
): SQLFragment<TFields> {
  return resolveInnerExpr(expressionOrFieldName).notBetween(min, max);
}

/**
 * Generates a case-sensitive `LIKE` condition from a fragment.
 *
 * @param fragment - A SQLFragment or SQLChainableFragment to match
 * @param pattern - The LIKE pattern (use `%` for wildcards, `_` for single character)
 */
function likeHelper<TFragment extends SQLFragment<any>>(
  fragment: TFragment,
  pattern: string,
): SQLFragment<ExtractFragmentFields<TFragment>>;
/**
 * Generates a case-sensitive `LIKE` condition from a field name.
 *
 * @param fieldName - The entity field name to match
 * @param pattern - The LIKE pattern (use `%` for wildcards, `_` for single character)
 */
function likeHelper<TFields extends Record<string, any>, N extends PickStringValueKeys<TFields>>(
  fieldName: N,
  pattern: string,
): SQLFragment<TFields>;
function likeHelper<TFields extends Record<string, any>>(
  expressionOrFieldName: SQLFragment<TFields> | keyof TFields,
  pattern: string,
): SQLFragment<TFields> {
  return resolveInnerExpr(expressionOrFieldName).like(pattern);
}

/**
 * Generates a case-sensitive `NOT LIKE` condition from a fragment.
 *
 * @param fragment - A SQLFragment or SQLChainableFragment to match
 * @param pattern - The LIKE pattern (use `%` for wildcards, `_` for single character)
 */
function notLikeHelper<TFragment extends SQLFragment<any>>(
  fragment: TFragment,
  pattern: string,
): SQLFragment<ExtractFragmentFields<TFragment>>;
/**
 * Generates a case-sensitive `NOT LIKE` condition from a field name.
 *
 * @param fieldName - The entity field name to match
 * @param pattern - The LIKE pattern (use `%` for wildcards, `_` for single character)
 */
function notLikeHelper<TFields extends Record<string, any>, N extends PickStringValueKeys<TFields>>(
  fieldName: N,
  pattern: string,
): SQLFragment<TFields>;
function notLikeHelper<TFields extends Record<string, any>>(
  expressionOrFieldName: SQLFragment<TFields> | keyof TFields,
  pattern: string,
): SQLFragment<TFields> {
  return resolveInnerExpr(expressionOrFieldName).notLike(pattern);
}

/**
 * Generates a case-insensitive `ILIKE` condition from a fragment (PostgreSQL-specific).
 *
 * @param fragment - A SQLFragment or SQLChainableFragment to match
 * @param pattern - The LIKE pattern (use `%` for wildcards, `_` for single character)
 */
function ilikeHelper<TFragment extends SQLFragment<any>>(
  fragment: TFragment,
  pattern: string,
): SQLFragment<ExtractFragmentFields<TFragment>>;
/**
 * Generates a case-insensitive `ILIKE` condition from a field name (PostgreSQL-specific).
 *
 * @param fieldName - The entity field name to match
 * @param pattern - The LIKE pattern (use `%` for wildcards, `_` for single character)
 */
function ilikeHelper<TFields extends Record<string, any>, N extends PickStringValueKeys<TFields>>(
  fieldName: N,
  pattern: string,
): SQLFragment<TFields>;
function ilikeHelper<TFields extends Record<string, any>>(
  expressionOrFieldName: SQLFragment<TFields> | keyof TFields,
  pattern: string,
): SQLFragment<TFields> {
  return resolveInnerExpr(expressionOrFieldName).ilike(pattern);
}

/**
 * Generates a case-insensitive `NOT ILIKE` condition from a fragment (PostgreSQL-specific).
 *
 * @param fragment - A SQLFragment or SQLChainableFragment to match
 * @param pattern - The LIKE pattern (use `%` for wildcards, `_` for single character)
 */
function notIlikeHelper<TFragment extends SQLFragment<any>>(
  fragment: TFragment,
  pattern: string,
): SQLFragment<ExtractFragmentFields<TFragment>>;
/**
 * Generates a case-insensitive `NOT ILIKE` condition from a field name (PostgreSQL-specific).
 *
 * @param fieldName - The entity field name to match
 * @param pattern - The LIKE pattern (use `%` for wildcards, `_` for single character)
 */
function notIlikeHelper<
  TFields extends Record<string, any>,
  N extends PickStringValueKeys<TFields>,
>(fieldName: N, pattern: string): SQLFragment<TFields>;
function notIlikeHelper<TFields extends Record<string, any>>(
  expressionOrFieldName: SQLFragment<TFields> | keyof TFields,
  pattern: string,
): SQLFragment<TFields> {
  return resolveInnerExpr(expressionOrFieldName).notIlike(pattern);
}

/**
 * Generates an `IS NULL` condition from a fragment.
 *
 * @param fragment - A SQLFragment or SQLChainableFragment to check
 */
function isNullHelper<TFragment extends SQLFragment<any>>(
  fragment: TFragment,
): SQLFragment<ExtractFragmentFields<TFragment>>;
/**
 * Generates an `IS NULL` condition from a field name.
 *
 * @param fieldName - The entity field name to check
 */
function isNullHelper<TFields extends Record<string, any>, N extends keyof TFields>(
  fieldName: N,
): SQLFragment<TFields>;
function isNullHelper<TFields extends Record<string, any>>(
  expressionOrFieldName: SQLFragment<TFields> | keyof TFields,
): SQLFragment<TFields> {
  return resolveInnerExpr(expressionOrFieldName).isNull();
}

/**
 * Generates an `IS NOT NULL` condition from a fragment.
 *
 * @param fragment - A SQLFragment or SQLChainableFragment to check
 */
function isNotNullHelper<TFragment extends SQLFragment<any>>(
  fragment: TFragment,
): SQLFragment<ExtractFragmentFields<TFragment>>;
/**
 * Generates an `IS NOT NULL` condition from a field name.
 *
 * @param fieldName - The entity field name to check
 */
function isNotNullHelper<TFields extends Record<string, any>, N extends keyof TFields>(
  fieldName: N,
): SQLFragment<TFields>;
function isNotNullHelper<TFields extends Record<string, any>>(
  expressionOrFieldName: SQLFragment<TFields> | keyof TFields,
): SQLFragment<TFields> {
  return resolveInnerExpr(expressionOrFieldName).isNotNull();
}

/**
 * Generates an equality condition (`= value`) from a fragment.
 * Automatically converts `null`/`undefined` to `IS NULL`.
 *
 * @param fragment - A SQLFragment or SQLChainableFragment to compare
 * @param value - The value to compare against
 */
function eqHelper<TFragment extends SQLFragment<any>>(
  fragment: TFragment,
  value: FragmentValueNullable<TFragment>,
): SQLFragment<ExtractFragmentFields<TFragment>>;
/**
 * Generates an equality condition (`= value`) from a field name.
 * Automatically converts `null`/`undefined` to `IS NULL`.
 *
 * @param fieldName - The entity field name to compare
 * @param value - The value to compare against
 */
function eqHelper<
  TFields extends Record<string, any>,
  N extends PickSupportedSQLValueKeys<TFields>,
>(fieldName: N, value: TFields[N]): SQLFragment<TFields>;
function eqHelper<TFields extends Record<string, any>>(
  expressionOrFieldName: SQLFragment<TFields> | keyof TFields,
  value: SupportedSQLValue,
): SQLFragment<TFields> {
  return resolveInnerExpr(expressionOrFieldName).eq(value);
}

/**
 * Generates an inequality condition (`!= value`) from a fragment.
 * Automatically converts `null`/`undefined` to `IS NOT NULL`.
 *
 * @param fragment - A SQLFragment or SQLChainableFragment to compare
 * @param value - The value to compare against
 */
function neqHelper<TFragment extends SQLFragment<any>>(
  fragment: TFragment,
  value: FragmentValueNullable<TFragment>,
): SQLFragment<ExtractFragmentFields<TFragment>>;
/**
 * Generates an inequality condition (`!= value`) from a field name.
 * Automatically converts `null`/`undefined` to `IS NOT NULL`.
 *
 * @param fieldName - The entity field name to compare
 * @param value - The value to compare against
 */
function neqHelper<
  TFields extends Record<string, any>,
  N extends PickSupportedSQLValueKeys<TFields>,
>(fieldName: N, value: TFields[N]): SQLFragment<TFields>;
function neqHelper<TFields extends Record<string, any>>(
  expressionOrFieldName: SQLFragment<TFields> | keyof TFields,
  value: SupportedSQLValue,
): SQLFragment<TFields> {
  return resolveInnerExpr(expressionOrFieldName).neq(value);
}

/**
 * Generates a greater-than condition (`> value`) from a fragment.
 *
 * @param fragment - A SQLFragment or SQLChainableFragment to compare
 * @param value - The value to compare against
 */
function gtHelper<TFragment extends SQLFragment<any>>(
  fragment: TFragment,
  value: FragmentValue<TFragment>,
): SQLFragment<ExtractFragmentFields<TFragment>>;
/**
 * Generates a greater-than condition (`> value`) from a field name.
 *
 * @param fieldName - The entity field name to compare
 * @param value - The value to compare against
 */
function gtHelper<
  TFields extends Record<string, any>,
  N extends PickSupportedSQLValueKeys<TFields>,
>(fieldName: N, value: TFields[N]): SQLFragment<TFields>;
function gtHelper<TFields extends Record<string, any>>(
  expressionOrFieldName: SQLFragment<TFields> | keyof TFields,
  value: SupportedSQLValue,
): SQLFragment<TFields> {
  return resolveInnerExpr(expressionOrFieldName).gt(value);
}

/**
 * Generates a greater-than-or-equal-to condition (`>= value`) from a fragment.
 *
 * @param fragment - A SQLFragment or SQLChainableFragment to compare
 * @param value - The value to compare against
 */
function gteHelper<TFragment extends SQLFragment<any>>(
  fragment: TFragment,
  value: FragmentValue<TFragment>,
): SQLFragment<ExtractFragmentFields<TFragment>>;
/**
 * Generates a greater-than-or-equal-to condition (`>= value`) from a field name.
 *
 * @param fieldName - The entity field name to compare
 * @param value - The value to compare against
 */
function gteHelper<
  TFields extends Record<string, any>,
  N extends PickSupportedSQLValueKeys<TFields>,
>(fieldName: N, value: TFields[N]): SQLFragment<TFields>;
function gteHelper<TFields extends Record<string, any>>(
  expressionOrFieldName: SQLFragment<TFields> | keyof TFields,
  value: SupportedSQLValue,
): SQLFragment<TFields> {
  return resolveInnerExpr(expressionOrFieldName).gte(value);
}

/**
 * Generates a less-than condition (`< value`) from a fragment.
 *
 * @param fragment - A SQLFragment or SQLChainableFragment to compare
 * @param value - The value to compare against
 */
function ltHelper<TFragment extends SQLFragment<any>>(
  fragment: TFragment,
  value: FragmentValue<TFragment>,
): SQLFragment<ExtractFragmentFields<TFragment>>;
/**
 * Generates a less-than condition (`< value`) from a field name.
 *
 * @param fieldName - The entity field name to compare
 * @param value - The value to compare against
 */
function ltHelper<
  TFields extends Record<string, any>,
  N extends PickSupportedSQLValueKeys<TFields>,
>(fieldName: N, value: TFields[N]): SQLFragment<TFields>;
function ltHelper<TFields extends Record<string, any>>(
  expressionOrFieldName: SQLFragment<TFields> | keyof TFields,
  value: SupportedSQLValue,
): SQLFragment<TFields> {
  return resolveInnerExpr(expressionOrFieldName).lt(value);
}

/**
 * Generates a less-than-or-equal-to condition (`<= value`) from a fragment.
 *
 * @param fragment - A SQLFragment or SQLChainableFragment to compare
 * @param value - The value to compare against
 */
function lteHelper<TFragment extends SQLFragment<any>>(
  fragment: TFragment,
  value: FragmentValue<TFragment>,
): SQLFragment<ExtractFragmentFields<TFragment>>;
/**
 * Generates a less-than-or-equal-to condition (`<= value`) from a field name.
 *
 * @param fieldName - The entity field name to compare
 * @param value - The value to compare against
 */
function lteHelper<
  TFields extends Record<string, any>,
  N extends PickSupportedSQLValueKeys<TFields>,
>(fieldName: N, value: TFields[N]): SQLFragment<TFields>;
function lteHelper<TFields extends Record<string, any>>(
  expressionOrFieldName: SQLFragment<TFields> | keyof TFields,
  value: SupportedSQLValue,
): SQLFragment<TFields> {
  return resolveInnerExpr(expressionOrFieldName).lte(value);
}

/**
 * Generates a JSON contains condition (`@>`) from a fragment.
 * Tests whether the JSON value contains the given value.
 *
 * @param fragment - A SQLFragment or SQLChainableFragment to check
 * @param value - The JSON value to check containment of
 */
function jsonContainsHelper<TFragment extends SQLFragment<any>>(
  fragment: TFragment,
  value: JsonSerializable,
): SQLFragment<ExtractFragmentFields<TFragment>>;
/**
 * Generates a JSON contains condition (`@>`) from a field name.
 * Tests whether the JSON value contains the given value.
 *
 * @param fieldName - The entity field name to check
 * @param value - The JSON value to check containment of
 */
function jsonContainsHelper<TFields extends Record<string, any>, N extends keyof TFields>(
  fieldName: N,
  value: JsonSerializable,
): SQLFragment<TFields>;
function jsonContainsHelper<TFields extends Record<string, any>>(
  expressionOrFieldName: SQLFragment<TFields> | keyof TFields,
  value: JsonSerializable,
): SQLFragment<TFields> {
  const serialized = JSON.stringify(value);
  assert(
    serialized !== undefined || value === undefined,
    'jsonContains: value is not JSON-serializable',
  );
  const inner = resolveInner(expressionOrFieldName);
  return sql`${inner} @> ${serialized}::jsonb`;
}

/**
 * Generates a JSON contained-by condition (`<@`) from a fragment.
 * Tests whether the JSON value is contained by the given value.
 *
 * @param fragment - A SQLFragment or SQLChainableFragment to check
 * @param value - The JSON value to check containment against
 */
function jsonContainedByHelper<TFragment extends SQLFragment<any>>(
  fragment: TFragment,
  value: JsonSerializable,
): SQLFragment<ExtractFragmentFields<TFragment>>;
/**
 * Generates a JSON contained-by condition (`<@`) from a field name.
 * Tests whether the JSON value is contained by the given value.
 *
 * @param fieldName - The entity field name to check
 * @param value - The JSON value to check containment against
 */
function jsonContainedByHelper<TFields extends Record<string, any>, N extends keyof TFields>(
  fieldName: N,
  value: JsonSerializable,
): SQLFragment<TFields>;
function jsonContainedByHelper<TFields extends Record<string, any>>(
  expressionOrFieldName: SQLFragment<TFields> | keyof TFields,
  value: JsonSerializable,
): SQLFragment<TFields> {
  const serialized = JSON.stringify(value);
  assert(
    serialized !== undefined || value === undefined,
    'jsonContainedBy: value is not JSON-serializable',
  );
  const inner = resolveInner(expressionOrFieldName);
  return sql`${inner} <@ ${serialized}::jsonb`;
}

/**
 * JSON path extraction (`->`) from a fragment. Returns JSON.
 * Returns an SQLChainableFragment for fluent chaining.
 *
 * @param fragment - A SQLFragment or SQLChainableFragment to extract from
 * @param path - The JSON key to extract
 */
function jsonPathHelper<TFragment extends SQLFragment<any>>(
  fragment: TFragment,
  path: string,
): SQLChainableFragment<ExtractFragmentFields<TFragment>, SupportedSQLValue>;
/**
 * JSON path extraction (`->`) from a field name. Returns JSON.
 * Returns an SQLChainableFragment for fluent chaining.
 *
 * @param fieldName - The entity field name to extract from
 * @param path - The JSON key to extract
 */
function jsonPathHelper<TFields extends Record<string, any>, N extends keyof TFields>(
  fieldName: N,
  path: string,
): SQLChainableFragment<TFields, SupportedSQLValue>;
function jsonPathHelper<TFields extends Record<string, any>>(
  expressionOrFieldName: SQLFragment<TFields> | keyof TFields,
  path: string,
): SQLChainableFragment<TFields, SupportedSQLValue> {
  const inner = resolveInner(expressionOrFieldName);
  const wrapped = sql`${inner}->${path}`;
  return new SQLChainableFragment(wrapped.sql, wrapped.bindings);
}

/**
 * JSON path text extraction (`->>`) from a fragment. Returns text.
 * Returns an SQLChainableFragment for fluent chaining.
 *
 * @param fragment - A SQLFragment or SQLChainableFragment to extract from
 * @param path - The JSON key to extract as text
 */
function jsonPathTextHelper<TFragment extends SQLFragment<any>>(
  fragment: TFragment,
  path: string,
): SQLChainableFragment<ExtractFragmentFields<TFragment>, SupportedSQLValue>;
/**
 * JSON path text extraction (`->>`) from a field name. Returns text.
 * Returns an SQLChainableFragment for fluent chaining.
 *
 * @param fieldName - The entity field name to extract from
 * @param path - The JSON key to extract as text
 */
function jsonPathTextHelper<TFields extends Record<string, any>, N extends keyof TFields>(
  fieldName: N,
  path: string,
): SQLChainableFragment<TFields, SupportedSQLValue>;
function jsonPathTextHelper<TFields extends Record<string, any>>(
  expressionOrFieldName: SQLFragment<TFields> | keyof TFields,
  path: string,
): SQLChainableFragment<TFields, SupportedSQLValue> {
  const inner = resolveInner(expressionOrFieldName);
  const wrapped = sql`${inner}->>${path}`;
  return new SQLChainableFragment(wrapped.sql, wrapped.bindings);
}

/**
 * JSON deep path extraction (`#>`) from a fragment. Returns JSON at the specified key path.
 * Returns an SQLChainableFragment for fluent chaining.
 *
 * @param fragment - A SQLFragment or SQLChainableFragment to extract from
 * @param path - Array of keys forming the path (e.g., ['user', 'address', 'city'])
 */
function jsonDeepPathHelper<TFragment extends SQLFragment<any>>(
  fragment: TFragment,
  path: readonly string[],
): SQLChainableFragment<ExtractFragmentFields<TFragment>, SupportedSQLValue>;
/**
 * JSON deep path extraction (`#>`) from a field name. Returns JSON at the specified key path.
 * Returns an SQLChainableFragment for fluent chaining.
 *
 * @param fieldName - The entity field name to extract from
 * @param path - Array of keys forming the path (e.g., ['user', 'address', 'city'])
 */
function jsonDeepPathHelper<TFields extends Record<string, any>, N extends keyof TFields>(
  fieldName: N,
  path: readonly string[],
): SQLChainableFragment<TFields, SupportedSQLValue>;
function jsonDeepPathHelper<TFields extends Record<string, any>>(
  expressionOrFieldName: SQLFragment<TFields> | keyof TFields,
  path: readonly string[],
): SQLChainableFragment<TFields, SupportedSQLValue> {
  const pathLiteral = `{${path.map(quotePostgresArrayElement).join(',')}}`;
  const inner = resolveInner(expressionOrFieldName);
  const wrapped = sql`${inner} #> ${pathLiteral}`;
  return new SQLChainableFragment(wrapped.sql, wrapped.bindings);
}

/**
 * JSON deep path text extraction (`#>>`) from a fragment. Returns text at the specified key path.
 * Returns an SQLChainableFragment for fluent chaining.
 *
 * @param fragment - A SQLFragment or SQLChainableFragment to extract from
 * @param path - Array of keys forming the path (e.g., ['user', 'address', 'city'])
 */
function jsonDeepPathTextHelper<TFragment extends SQLFragment<any>>(
  fragment: TFragment,
  path: readonly string[],
): SQLChainableFragment<ExtractFragmentFields<TFragment>, SupportedSQLValue>;
/**
 * JSON deep path text extraction (`#>>`) from a field name. Returns text at the specified key path.
 * Returns an SQLChainableFragment for fluent chaining.
 *
 * @param fieldName - The entity field name to extract from
 * @param path - Array of keys forming the path (e.g., ['user', 'address', 'city'])
 */
function jsonDeepPathTextHelper<TFields extends Record<string, any>, N extends keyof TFields>(
  fieldName: N,
  path: readonly string[],
): SQLChainableFragment<TFields, SupportedSQLValue>;
function jsonDeepPathTextHelper<TFields extends Record<string, any>>(
  expressionOrFieldName: SQLFragment<TFields> | keyof TFields,
  path: readonly string[],
): SQLChainableFragment<TFields, SupportedSQLValue> {
  const pathLiteral = `{${path.map(quotePostgresArrayElement).join(',')}}`;
  const inner = resolveInner(expressionOrFieldName);
  const wrapped = sql`${inner} #>> ${pathLiteral}`;
  return new SQLChainableFragment(wrapped.sql, wrapped.bindings);
}

/**
 * SQL type cast (`::type`) from a fragment.
 * Returns an SQLChainableFragment for fluent chaining.
 *
 * @param fragment - A SQLFragment or SQLChainableFragment to cast
 * @param typeName - The PostgreSQL type name (e.g., 'int', 'text', 'timestamptz')
 */
function castHelper<TFragment extends SQLFragment<any>>(
  fragment: TFragment,
  typeName: PostgresCastType,
): SQLChainableFragment<ExtractFragmentFields<TFragment>, SupportedSQLValue>;
/**
 * SQL type cast (`::type`) from a field name.
 * Returns an SQLChainableFragment for fluent chaining.
 *
 * @param fieldName - The entity field name to cast
 * @param typeName - The PostgreSQL type name (e.g., 'int', 'text', 'timestamptz')
 */
function castHelper<TFields extends Record<string, any>, N extends keyof TFields>(
  fieldName: N,
  typeName: PostgresCastType,
): SQLChainableFragment<TFields, SupportedSQLValue>;
function castHelper<TFields extends Record<string, any>>(
  expressionOrFieldName: SQLFragment<TFields> | keyof TFields,
  typeName: PostgresCastType,
): SQLChainableFragment<TFields, SupportedSQLValue> {
  assert(
    ALLOWED_CAST_TYPES_SET.has(typeName),
    `cast: unsupported type name "${typeName}". Allowed types: ${[...ALLOWED_CAST_TYPES_SET].join(', ')}`,
  );
  const inner = resolveInner(expressionOrFieldName);
  const wrapped = sql`(${inner})::${unsafeRaw(typeName)}`;
  return new SQLChainableFragment(wrapped.sql, wrapped.bindings);
}

/**
 * Wraps a fragment in `LOWER()` to convert to lowercase.
 * Returns an SQLChainableFragment for fluent chaining.
 *
 * @param fragment - A SQLFragment or SQLChainableFragment to convert
 */
function lowerHelper<TFragment extends SQLFragment<any>>(
  fragment: TFragment,
): SQLChainableFragment<ExtractFragmentFields<TFragment>, SupportedSQLValue>;
/**
 * Wraps a field in `LOWER()` to convert to lowercase.
 * Returns an SQLChainableFragment for fluent chaining.
 *
 * @param fieldName - The entity field name to convert
 */
function lowerHelper<TFields extends Record<string, any>, N extends PickStringValueKeys<TFields>>(
  fieldName: N,
): SQLChainableFragment<TFields, TFields[N]>;
function lowerHelper<TFields extends Record<string, any>>(
  expressionOrFieldName: SQLFragment<TFields> | keyof TFields,
): SQLChainableFragment<TFields, SupportedSQLValue> {
  const inner = resolveInner(expressionOrFieldName);
  const wrapped = sql`LOWER(${inner})`;
  return new SQLChainableFragment(wrapped.sql, wrapped.bindings);
}

/**
 * Wraps a fragment in `UPPER()` to convert to uppercase.
 * Returns an SQLChainableFragment for fluent chaining.
 *
 * @param fragment - A SQLFragment or SQLChainableFragment to convert
 */
function upperHelper<TFragment extends SQLFragment<any>>(
  fragment: TFragment,
): SQLChainableFragment<ExtractFragmentFields<TFragment>, SupportedSQLValue>;
/**
 * Wraps a field in `UPPER()` to convert to uppercase.
 * Returns an SQLChainableFragment for fluent chaining.
 *
 * @param fieldName - The entity field name to convert
 */
function upperHelper<TFields extends Record<string, any>, N extends PickStringValueKeys<TFields>>(
  fieldName: N,
): SQLChainableFragment<TFields, TFields[N]>;
function upperHelper<TFields extends Record<string, any>>(
  expressionOrFieldName: SQLFragment<TFields> | keyof TFields,
): SQLChainableFragment<TFields, SupportedSQLValue> {
  const inner = resolveInner(expressionOrFieldName);
  const wrapped = sql`UPPER(${inner})`;
  return new SQLChainableFragment(wrapped.sql, wrapped.bindings);
}

/**
 * Wraps a fragment in `TRIM()` to remove leading and trailing whitespace.
 * Returns an SQLChainableFragment for fluent chaining.
 *
 * @param fragment - A SQLFragment or SQLChainableFragment to trim
 */
function trimHelper<TFragment extends SQLFragment<any>>(
  fragment: TFragment,
): SQLChainableFragment<ExtractFragmentFields<TFragment>, SupportedSQLValue>;
/**
 * Wraps a field in `TRIM()` to remove leading and trailing whitespace.
 * Returns an SQLChainableFragment for fluent chaining.
 *
 * @param fieldName - The entity field name to trim
 */
function trimHelper<TFields extends Record<string, any>, N extends PickStringValueKeys<TFields>>(
  fieldName: N,
): SQLChainableFragment<TFields, TFields[N]>;
function trimHelper<TFields extends Record<string, any>>(
  expressionOrFieldName: SQLFragment<TFields> | keyof TFields,
): SQLChainableFragment<TFields, SupportedSQLValue> {
  const inner = resolveInner(expressionOrFieldName);
  const wrapped = sql`TRIM(${inner})`;
  return new SQLChainableFragment(wrapped.sql, wrapped.bindings);
}

/**
 * Common SQL helper functions for building queries.
 *
 * All methods accept either a field name (string) or a SQLFragment/SQLChainableFragment as the
 * first argument. When a SQLChainableFragment with a known TValue is passed (e.g. from trim, lower),
 * value parameters are type-checked against that TValue.
 *
 * @example
 * ```ts
 * // Field name usage
 * SQLExpression.eq('status', 'active')
 *
 * // SQLFragment/SQLChainableFragment usage
 * SQLExpression.eq(sql`${entityField('status')}`, 'active')
 * SQLExpression.eq(SQLExpression.trim('name'), 'hello') // value constrained to string
 * ```
 */
export const SQLExpression = {
  /**
   * IN clause helper.
   *
   * @example
   * ```ts
   * SQLExpression.inArray('status', ['active', 'pending'])
   * SQLExpression.inArray(SQLExpression.lower('status'), ['active', 'pending'])
   * ```
   */
  inArray: inArrayHelper,

  /**
   * = ANY() clause helper. Binds the array as a single parameter instead of expanding it.
   * Semantically equivalent to IN for most cases, but retains a consistent query shape for
   * query metrics.
   *
   * @example
   * ```ts
   * SQLExpression.anyArray('status', ['active', 'pending'])
   * ```
   */
  anyArray: anyArrayHelper,

  /**
   * NOT IN clause helper.
   */
  notInArray: notInArrayHelper,

  /**
   * BETWEEN helper.
   *
   * @example
   * ```ts
   * SQLExpression.between('age', 18, 65)
   * SQLExpression.between(SQLExpression.cast('age', 'int'), 18, 65)
   * ```
   */
  between: betweenHelper,

  /**
   * NOT BETWEEN helper.
   */
  notBetween: notBetweenHelper,

  /**
   * LIKE helper for case-sensitive pattern matching.
   *
   * @example
   * ```ts
   * SQLExpression.like('name', '%John%')
   * ```
   */
  like: likeHelper,

  /**
   * NOT LIKE helper.
   */
  notLike: notLikeHelper,

  /**
   * ILIKE helper for case-insensitive matching (PostgreSQL-specific).
   */
  ilike: ilikeHelper,

  /**
   * NOT ILIKE helper for case-insensitive non-matching (PostgreSQL-specific).
   */
  notIlike: notIlikeHelper,

  /**
   * IS NULL check helper.
   */
  isNull: isNullHelper,

  /**
   * IS NOT NULL check helper.
   */
  isNotNull: isNotNullHelper,

  /**
   * Equality operator. Automatically converts null/undefined to IS NULL.
   */
  eq: eqHelper,

  /**
   * Inequality operator. Automatically converts null/undefined to IS NOT NULL.
   */
  neq: neqHelper,

  /**
   * Greater-than comparison operator.
   */
  gt: gtHelper,

  /**
   * Greater-than-or-equal-to comparison operator.
   */
  gte: gteHelper,

  /**
   * Less-than comparison operator.
   */
  lt: ltHelper,

  /**
   * Less-than-or-equal-to comparison operator.
   */
  lte: lteHelper,

  /**
   * JSON contains operator (\@\>).
   */
  jsonContains: jsonContainsHelper,

  /**
   * JSON contained by operator (\<\@\).
   */
  jsonContainedBy: jsonContainedByHelper,

  /**
   * JSON path extraction helper (-\>).
   * Returns an SQLChainableFragment so that fluent comparison methods can be chained.
   */
  jsonPath: jsonPathHelper,

  /**
   * JSON path text extraction helper (-\>\>).
   * Returns an SQLChainableFragment so that fluent comparison methods can be chained.
   */
  jsonPathText: jsonPathTextHelper,

  /**
   * JSON deep path extraction helper (#\>).
   * Extracts a JSON sub-object at the specified key path, returning jsonb.
   * Returns an SQLChainableFragment so that fluent comparison methods can be chained.
   *
   * @param expressionOrFieldName - A SQLFragment/SQLChainableFragment or entity field name
   * @param path - Array of keys forming the path (e.g., ['user', 'address', 'city'])
   */
  jsonDeepPath: jsonDeepPathHelper,

  /**
   * JSON deep path text extraction helper (#\>\>).
   * Extracts a JSON sub-object at the specified key path as text.
   * Returns an SQLChainableFragment so that fluent comparison methods can be chained.
   *
   * @param expressionOrFieldName - A SQLFragment/SQLChainableFragment or entity field name
   * @param path - Array of keys forming the path (e.g., ['user', 'address', 'city'])
   */
  jsonDeepPathText: jsonDeepPathTextHelper,

  /**
   * SQL type cast helper (::type).
   * Casts an expression or field to a PostgreSQL type.
   * Returns an SQLChainableFragment so that fluent comparison methods can be chained.
   *
   * @param expressionOrFieldName - A SQLFragment/SQLChainableFragment or entity field name to cast
   * @param typeName - The PostgreSQL type name (e.g., 'int', 'text', 'timestamptz')
   */
  cast: castHelper,

  /**
   * COALESCE helper.
   * Returns the first non-null value from the given expressions/values.
   * Returns an SQLChainableFragment so that fluent comparison methods can be chained.
   */
  coalesce<TFields extends Record<string, any>>(
    ...args: readonly (SQLFragment<TFields> | SupportedSQLValue)[]
  ): SQLChainableFragment<TFields, SupportedSQLValue> {
    const fragments = args.map((arg) => {
      if (arg instanceof SQLFragment) {
        return arg;
      }
      return sql`${arg}`;
    });
    const inner = sql`COALESCE(${SQLFragment.joinWithCommaSeparator(...fragments)})`;
    return new SQLChainableFragment(inner.sql, inner.bindings);
  },

  /**
   * LOWER helper
   * Converts a string expression to lowercase.
   * Returns an SQLChainableFragment so that fluent comparison methods can be chained.
   */
  lower: lowerHelper,

  /**
   * UPPER helper
   * Converts a string expression to uppercase.
   * Returns an SQLChainableFragment so that fluent comparison methods can be chained.
   */
  upper: upperHelper,

  /**
   * TRIM helper
   * Removes leading and trailing whitespace from a string expression.
   * Returns an SQLChainableFragment so that fluent comparison methods can be chained.
   */
  trim: trimHelper,

  /**
   * Logical AND of multiple fragments
   */
  and<TFields extends Record<string, any>>(
    ...conditions: readonly SQLFragment<TFields>[]
  ): SQLFragment<TFields> {
    if (conditions.length === 0) {
      return sql`TRUE`;
    }
    return joinSQLFragments(
      conditions.map((c) => SQLExpression.group(c)),
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
      return sql`FALSE`;
    }
    return joinSQLFragments(
      conditions.map((c) => SQLExpression.group(c)),
      ' OR ',
    );
  },

  /**
   * Logical NOT of a fragment
   */
  not<TFields extends Record<string, any>>(condition: SQLFragment<TFields>): SQLFragment<TFields> {
    return sql`NOT (${condition})`;
  },

  /**
   * Parentheses helper for grouping conditions
   */
  group<TFields extends Record<string, any>>(
    condition: SQLFragment<TFields>,
  ): SQLFragment<TFields> {
    return sql`(${condition})`;
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

// Internal helper to properly quote elements for PostgreSQL array literals.
// Elements containing special characters (commas, braces, quotes, backslashes, whitespace)
// or empty strings must be double-quoted with internal escaping.
function quotePostgresArrayElement(element: string): string {
  if (element === '' || /[,{}"\\\s]/.test(element)) {
    return `"${element.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return element;
}

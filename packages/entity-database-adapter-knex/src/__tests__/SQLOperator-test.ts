import { getDatabaseFieldForEntityField } from '@expo/entity';
import { describe, expect, it } from '@jest/globals';

import {
  arrayValue,
  entityField,
  identifier,
  sql,
  SQLEntityField,
  SQLChainableFragment,
  SQLFragment,
  SQLExpression,
  SQLIdentifier,
  unsafeRaw,
  type SupportedSQLValue,
} from '../SQLOperator.ts';
import type { TestFields } from './fixtures/TestEntity.ts';
import { testEntityConfiguration } from './fixtures/TestEntity.ts';

const getColumnForField = (fieldName: string): string =>
  getDatabaseFieldForEntityField(testEntityConfiguration, fieldName as keyof TestFields);

describe('SQLOperator', () => {
  describe('sql template literal', () => {
    it('handles basic parameterized queries', () => {
      const age = 18;
      const status = 'active';
      const fragment = sql`age >= ${age} AND status = ${status}`;

      expect(fragment.sql).toBe('age >= ? AND status = ?');
      expect(fragment.getKnexBindings(getColumnForField)).toEqual([18, 'active']);
    });

    it('handles nested SQL fragments', () => {
      const condition1 = sql`age >= ${18}`;
      const condition2 = sql`status = ${'active'}`;
      const combined = sql`${condition1} AND ${condition2}`;

      expect(combined.sql).toBe('age >= ? AND status = ?');
      expect(combined.getKnexBindings(getColumnForField)).toEqual([18, 'active']);
    });

    it('handles SQL identifiers', () => {
      const columnName = 'user_name';
      const fragment = sql`${identifier(columnName)} = ${'John'}`;

      expect(fragment.sql).toBe('?? = ?');
      expect(fragment.getKnexBindings(getColumnForField)).toEqual(['user_name', 'John']);
    });

    it('handles arrays for IN clauses', () => {
      const values = ['active', 'pending', 'approved'];
      const fragment = sql`status IN ${values}`;

      expect(fragment.sql).toBe('status IN (?, ?, ?)');
      expect(fragment.getKnexBindings(getColumnForField)).toEqual([
        'active',
        'pending',
        'approved',
      ]);
    });

    it('handles arrayValue as a single bound parameter', () => {
      const values = ['active', 'pending', 'approved'];
      const fragment = sql`status = ANY(${arrayValue(values)})`;

      expect(fragment.sql).toBe('status = ANY(?)');
      expect(fragment.getKnexBindings(getColumnForField)).toEqual([
        ['active', 'pending', 'approved'],
      ]);
    });

    it('handles arrayValue with entity field for = ANY()', () => {
      const values = ['active', 'pending'];
      const fragment = sql`${entityField('stringField')} = ANY(${arrayValue(values)})`;

      expect(fragment.sql).toBe('?? = ANY(?)');
      expect(fragment.getKnexBindings(getColumnForField)).toEqual([
        'string_field',
        ['active', 'pending'],
      ]);
    });

    it('handles null values', () => {
      const fragment = sql`field = ${null}`;

      expect(fragment.sql).toBe('field = ?');
      expect(fragment.getKnexBindings(getColumnForField)).toEqual([null]);
    });

    it('handles empty strings', () => {
      const fragment = sql`field = ${''}`;

      expect(fragment.sql).toBe('field = ?');
      expect(fragment.getKnexBindings(getColumnForField)).toEqual(['']);
    });

    it('handles numbers including zero', () => {
      const fragment = sql`count = ${0} OR count = ${42}`;

      expect(fragment.sql).toBe('count = ? OR count = ?');
      expect(fragment.getKnexBindings(getColumnForField)).toEqual([0, 42]);
    });

    it('handles boolean values', () => {
      const fragment = sql`active = ${true} AND deleted = ${false}`;

      expect(fragment.sql).toBe('active = ? AND deleted = ?');
      expect(fragment.getKnexBindings(getColumnForField)).toEqual([true, false]);
    });

    it('handles raw SQL', () => {
      const columnName = 'created_at';
      const fragment = sql`ORDER BY ${unsafeRaw(columnName)} DESC`;

      expect(fragment.sql).toBe('ORDER BY created_at DESC');
      expect(fragment.getKnexBindings(getColumnForField)).toEqual([]);
    });

    it('handles complex raw SQL expressions', () => {
      const fragment = sql`WHERE ${unsafeRaw('EXTRACT(year FROM created_at)')} = ${2024}`;

      expect(fragment.sql).toBe('WHERE EXTRACT(year FROM created_at) = ?');
      expect(fragment.getKnexBindings(getColumnForField)).toEqual([2024]);
    });

    it('combines raw SQL with regular parameters', () => {
      const sortColumn = 'name';
      const fragment = sql`SELECT * FROM users WHERE age > ${18} ORDER BY ${unsafeRaw(sortColumn)} ${unsafeRaw('DESC')}`;

      expect(fragment.sql).toBe('SELECT * FROM users WHERE age > ? ORDER BY name DESC');
      expect(fragment.getKnexBindings(getColumnForField)).toEqual([18]);
    });
  });

  describe(SQLFragment, () => {
    describe(SQLFragment.prototype.append, () => {
      it('appends fragments correctly', () => {
        const fragment1 = new SQLFragment('age >= ?', [{ type: 'value', value: 18 }]);
        const fragment2 = new SQLFragment('status = ?', [{ type: 'value', value: 'active' }]);
        const combined = fragment1.append(fragment2);

        expect(combined.sql).toBe('age >= ? status = ?');
        expect(combined.getKnexBindings(getColumnForField)).toEqual([18, 'active']);
      });
    });

    describe(SQLFragment.joinWithCommaSeparator, () => {
      it('handles empty array in join', () => {
        const joined = SQLFragment.joinWithCommaSeparator();

        expect(joined.sql).toBe('');
        expect(joined.getKnexBindings(getColumnForField)).toEqual([]);
      });

      it('joins SQL fragments with comma', () => {
        const columns = [sql`name`, sql`age`, sql`email`];
        const joined = SQLFragment.joinWithCommaSeparator(...columns);

        expect(joined.sql).toBe('name, age, email');
        expect(joined.getKnexBindings(getColumnForField)).toEqual([]);
      });

      it('handles single fragment', () => {
        const single = [sql`name = ${'Alice'}`];
        const joined = SQLFragment.joinWithCommaSeparator(...single);

        expect(joined.sql).toBe('name = ?');
        expect(joined.getKnexBindings(getColumnForField)).toEqual(['Alice']);
      });
    });

    describe(SQLFragment.concat, () => {
      it('concatenates fragments with space separator', () => {
        const select = new SQLFragment('SELECT * FROM users', []);
        const where = new SQLFragment('WHERE age > ?', [{ type: 'value', value: 18 }]);
        const orderBy = new SQLFragment('ORDER BY name', []);

        const concatenated = SQLFragment.concat(select, where, orderBy);

        expect(concatenated.sql).toBe('SELECT * FROM users WHERE age > ? ORDER BY name');
        expect(concatenated.getKnexBindings(getColumnForField)).toEqual([18]);
      });

      it('handles single fragment in concat', () => {
        const fragment = new SQLFragment('SELECT * FROM users', []);
        const concatenated = SQLFragment.concat(fragment);

        expect(concatenated.sql).toBe('SELECT * FROM users');
        expect(concatenated.getKnexBindings(getColumnForField)).toEqual([]);
      });

      it('handles empty concat', () => {
        const concatenated = SQLFragment.concat();

        expect(concatenated.sql).toBe('');
        expect(concatenated.getKnexBindings(getColumnForField)).toEqual([]);
      });

      it('supports dynamic query building with concat', () => {
        // Build a query dynamically
        const fragments: SQLFragment<Record<string, any>>[] = [sql`SELECT * FROM products`];

        // Conditionally add WHERE clause
        const filters: SQLFragment<Record<string, any>>[] = [];
        filters.push(sql`price > ${100}`);
        filters.push(sql`category = ${'electronics'}`);

        if (filters.length > 0) {
          fragments.push(sql`WHERE ${SQLExpression.and(...filters)}`);
        }

        // Add ORDER BY
        fragments.push(sql`ORDER BY created_at DESC`);

        // Add LIMIT
        fragments.push(sql`LIMIT ${10}`);

        const query = SQLFragment.concat(...fragments);

        expect(query.sql).toBe(
          'SELECT * FROM products WHERE (price > ?) AND (category = ?) ORDER BY created_at DESC LIMIT ?',
        );
        expect(query.getKnexBindings(getColumnForField)).toEqual([100, 'electronics', 10]);
      });
    });

    describe('getDebugString', () => {
      it('generates debug text with values inline', () => {
        const fragment = new SQLFragment(
          'SELECT * FROM users WHERE name = ? AND age > ? AND active = ? AND created_at > ?',
          [
            { type: 'value', value: 'Alice' },
            { type: 'value', value: 18 },
            { type: 'value', value: true },
            { type: 'value', value: new Date('2024-01-01') },
          ],
        );

        const text = fragment.getDebugString();
        expect(text).toContain("'Alice'");
        expect(text).toContain('18');
        expect(text).toContain('TRUE');
        expect(text).toContain('2024-01-01');
      });

      it('handles null and special characters in text', () => {
        const fragment = new SQLFragment('name = ? AND email = ? AND data = ?', [
          { type: 'value', value: null },
          { type: 'value', value: "O'Reilly" },
          { type: 'value', value: { key: 'value' } },
        ]);

        const text = fragment.getDebugString();
        expect(text).toContain('NULL');
        expect(text).toContain("O''Reilly"); // SQL escaped single quote
        expect(text).toContain(`'{"key":"value"}'::jsonb`);
      });

      it('handles all SupportedSQLValue types in getDebugString', () => {
        const fragment = new SQLFragment('INSERT INTO test VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [
          { type: 'value', value: 'string' },
          { type: 'value', value: 123 },
          { type: 'value', value: true },
          { type: 'value', value: null },
          { type: 'value', value: undefined },
          { type: 'value', value: new Date('2024-01-01T00:00:00.000Z') },
          { type: 'value', value: Buffer.from('hello') },
          { type: 'value', value: BigInt(999) },
          { type: 'value', value: [1, 2, 3] },
        ]);

        const text = fragment.getDebugString();
        expect(text).toBe(
          "INSERT INTO test VALUES ('string', 123, TRUE, NULL, NULL, '2024-01-01T00:00:00.000Z', '\\x68656c6c6f', 999, ARRAY[1, 2, 3])",
        );
      });

      it('handles nested arrays in getDebugString', () => {
        const fragment = new SQLFragment('SELECT * FROM test WHERE tags = ?', [
          { type: 'value', value: ['tag1', 'tag2', null] },
        ]);

        const text = fragment.getDebugString();
        expect(text).toBe("SELECT * FROM test WHERE tags = ARRAY['tag1', 'tag2', NULL]");
      });

      it('handles mismatched placeholders and values gracefully', () => {
        const fragment = new SQLFragment('SELECT * FROM test WHERE field1 = ? AND field2 = ?', [
          { type: 'value', value: 'value1' },
        ]);

        const text = fragment.getDebugString();
        expect(text).toBe("SELECT * FROM test WHERE field1 = 'value1' AND field2 = ?");
      });

      it('handles non-SupportedSQLValue types gracefully', () => {
        const fragment = new SQLFragment('SELECT * FROM test WHERE field = ? AND field2 = ?', [
          { type: 'value', value: new Error('wat') },
          { type: 'value', value: Object.create(null) },
        ]);

        const text = fragment.getDebugString();
        expect(text).toBe(
          `SELECT * FROM test WHERE field = UnsupportedSQLValue[Error: wat] AND field2 = '{}'::jsonb`,
        );
      });

      it('handles identifiers in getDebugString', () => {
        const fragment = new SQLFragment('SELECT ?? FROM ?? WHERE ?? = ?', [
          { type: 'identifier', name: 'user_name' },
          { type: 'identifier', name: 'users' },
          { type: 'identifier', name: 'status' },
          { type: 'value', value: 'active' },
        ]);

        const text = fragment.getDebugString();
        expect(text).toBe('SELECT "user_name" FROM "users" WHERE "status" = \'active\'');
      });

      it('handles entity fields in getDebugString', () => {
        const fragment = new SQLFragment('SELECT ?? FROM ?? WHERE ?? = ?', [
          { type: 'entityField', fieldName: 'string_field' },
          { type: 'identifier', name: 'test' },
          { type: 'entityField', fieldName: 'number_field' },
          { type: 'value', value: 42 },
        ]);

        const text = fragment.getDebugString();
        expect(text).toBe('SELECT "string_field" FROM "test" WHERE "number_field" = 42');
      });

      it('handles undefined bindings gracefully', () => {
        const fragment = new SQLFragment('SELECT * FROM users WHERE id = ? AND name = ?', [
          { type: 'value', value: 1 },
          undefined as any, // Simulate an edge case with undefined binding
        ]);

        const text = fragment.getDebugString();
        expect(text).toBe('SELECT * FROM users WHERE id = 1 AND name = ?');
      });

      it('handles null bindings gracefully', () => {
        const fragment = new SQLFragment('SELECT * FROM ?? WHERE ?? = ?', [
          { type: 'identifier', name: 'users' },
          null as any, // Simulate an edge case with null binding
          { type: 'value', value: 'test' },
        ]);

        const text = fragment.getDebugString();
        // When a binding is null, it leaves the placeholder unchanged and doesn't advance the index
        expect(text).toBe('SELECT * FROM "users" WHERE ?? = ?');
      });

      it('handles mismatch between identifier placeholder and value binding', () => {
        const fragment = new SQLFragment('SELECT * FROM ?? WHERE id = ?', [
          { type: 'value', value: 'users' }, // Wrong type - should be identifier
          { type: 'value', value: 1 },
        ]);

        const text = fragment.getDebugString();
        // Mismatched binding type leaves the placeholder unchanged
        expect(text).toBe('SELECT * FROM ?? WHERE id = 1');
      });

      it('handles mismatch between value placeholder and identifier binding', () => {
        const fragment = new SQLFragment('SELECT * FROM users WHERE ? = ?', [
          { type: 'identifier', name: 'status' }, // Wrong type - should be value
          { type: 'value', value: 'active' },
        ]);

        const text = fragment.getDebugString();
        // Mismatched binding type leaves the placeholder unchanged
        expect(text).toBe("SELECT * FROM users WHERE ? = 'active'");
      });
    });
  });

  describe(SQLIdentifier, () => {
    it('stores raw identifier names', () => {
      const id = identifier('user_name');
      expect(id.name).toBe('user_name');
    });

    it('stores identifier with quotes unchanged', () => {
      const id = identifier('table"name');
      expect(id.name).toBe('table"name');
    });

    it('stores identifier with multiple quotes unchanged', () => {
      const id = identifier('my"special"column');
      expect(id.name).toBe('my"special"column');
    });

    it('stores potential SQL injection attempts unchanged', () => {
      const id = identifier('col"; DROP TABLE users; --');
      expect(id.name).toBe('col"; DROP TABLE users; --');
    });

    it('handles empty string identifier', () => {
      const id = identifier('');
      expect(id.name).toBe('');
    });

    it('handles identifier with only quotes', () => {
      const id = identifier('"""');
      expect(id.name).toBe('"""');
    });

    it('uses ?? placeholder in SQL fragments', () => {
      const columnName = 'user"data';
      const fragment = sql`SELECT ${identifier(columnName)} FROM users`;
      expect(fragment.sql).toBe('SELECT ?? FROM users');
      expect(fragment.getKnexBindings(getColumnForField)).toEqual(['user"data']);
    });

    it('delegates escaping to Knex for SQL injection prevention', () => {
      const maliciousName = 'id"; DELETE FROM users WHERE "1"="1';
      const fragment = sql`SELECT * FROM ${identifier(maliciousName)}`;
      // The identifier is passed as a binding to Knex which will escape it
      expect(fragment.sql).toBe('SELECT * FROM ??');
      expect(fragment.getKnexBindings(getColumnForField)).toEqual([
        'id"; DELETE FROM users WHERE "1"="1',
      ]);
    });
  });

  describe(SQLEntityField, () => {
    it('stores the entity field name', () => {
      const field = entityField('stringField');
      expect(field.fieldName).toBe('stringField');
    });

    it('uses ?? placeholder in SQL fragments', () => {
      const fragment = sql`SELECT ${entityField('stringField')} FROM users`;

      expect(fragment.sql).toBe('SELECT ?? FROM users');
      expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field']);
    });

    it('translates entity field name to database column name via getKnexBindings', () => {
      const fragment = sql`WHERE ${entityField('intField')} = ${42}`;

      expect(fragment.sql).toBe('WHERE ?? = ?');
      expect(fragment.getKnexBindings(getColumnForField)).toEqual(['number_field', 42]);
    });

    it('translates the id field correctly', () => {
      const fragment = sql`WHERE ${entityField('customIdField')} = ${'some-id'}`;

      expect(fragment.sql).toBe('WHERE ?? = ?');
      expect(fragment.getKnexBindings(getColumnForField)).toEqual(['custom_id', 'some-id']);
    });

    it('works alongside identifiers and values', () => {
      const fragment = sql`SELECT ${identifier('table_name')}.${entityField('stringField')} WHERE ${entityField('intField')} > ${10}`;

      expect(fragment.sql).toBe('SELECT ??.?? WHERE ?? > ?');
      expect(fragment.getKnexBindings(getColumnForField)).toEqual([
        'table_name',
        'string_field',
        'number_field',
        10,
      ]);
    });

    it('works with multiple entity fields', () => {
      const fragment = sql`SELECT ${entityField('stringField')}, ${entityField('intField')}, ${entityField('dateField')} FROM test`;

      expect(fragment.sql).toBe('SELECT ??, ??, ?? FROM test');
      expect(fragment.getKnexBindings(getColumnForField)).toEqual([
        'string_field',
        'number_field',
        'date_field',
      ]);
    });

    it('works in nested SQL fragments', () => {
      const inner = sql`${entityField('stringField')} = ${'hello'}`;
      const outer = sql`SELECT * FROM test WHERE ${inner}`;

      expect(outer.sql).toBe('SELECT * FROM test WHERE ?? = ?');
      expect(outer.getKnexBindings(getColumnForField)).toEqual(['string_field', 'hello']);
    });
  });

  describe('SQLExpression', () => {
    describe(SQLExpression.inArray, () => {
      it('generates IN clause with values', () => {
        const fragment = SQLExpression.inArray('stringField', ['active', 'pending']);

        expect(fragment.sql).toBe('?? IN (?, ?)');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual([
          'string_field',
          'active',
          'pending',
        ]);
      });

      it('handles empty array', () => {
        const fragment = SQLExpression.inArray('stringField', []);

        expect(fragment.sql).toBe('FALSE'); // Always false
        expect(fragment.getKnexBindings(getColumnForField)).toEqual([]);
      });

      it('accepts a SQLFragment expression', () => {
        const fragment = SQLExpression.inArray(sql<TestFields>`${entityField('stringField')}`, [
          'a',
          'b',
        ]);
        expect(fragment.sql).toBe('?? IN (?, ?)');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field', 'a', 'b']);
      });

      it('accepts a SQLChainableFragment and constrains value type', () => {
        const fragment = SQLExpression.inArray(
          SQLExpression.trim<TestFields, 'stringField'>('stringField'),
          ['a', 'b'],
        );
        expect(fragment.sql).toBe('TRIM(??) IN (?, ?)');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field', 'a', 'b']);
      });
    });

    describe(SQLExpression.notInArray, () => {
      it('generates NOT IN clause with values', () => {
        const fragment = SQLExpression.notInArray('stringField', ['deleted', 'archived']);

        expect(fragment.sql).toBe('?? NOT IN (?, ?)');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual([
          'string_field',
          'deleted',
          'archived',
        ]);
      });

      it('handles empty array', () => {
        const fragment = SQLExpression.notInArray('stringField', []);

        expect(fragment.sql).toBe('TRUE'); // Always true
        expect(fragment.getKnexBindings(getColumnForField)).toEqual([]);
      });

      it('accepts a SQLFragment expression', () => {
        const fragment = SQLExpression.notInArray(sql<TestFields>`${entityField('stringField')}`, [
          'x',
        ]);
        expect(fragment.sql).toBe('?? NOT IN (?)');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field', 'x']);
      });
    });

    describe(SQLExpression.anyArray, () => {
      it('generates = ANY() clause with values', () => {
        const fragment = SQLExpression.anyArray('stringField', ['active', 'pending']);

        expect(fragment.sql).toBe('?? = ANY(?)');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual([
          'string_field',
          ['active', 'pending'],
        ]);
      });

      it('handles empty array', () => {
        const fragment = SQLExpression.anyArray('stringField', []);

        expect(fragment.sql).toBe('FALSE'); // Always false
        expect(fragment.getKnexBindings(getColumnForField)).toEqual([]);
      });

      it('accepts a SQLFragment expression', () => {
        const fragment = SQLExpression.anyArray(sql<TestFields>`${entityField('stringField')}`, [
          'a',
          'b',
        ]);
        expect(fragment.sql).toBe('?? = ANY(?)');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field', ['a', 'b']]);
      });
    });

    describe(SQLExpression.between, () => {
      it('generates BETWEEN clause with numbers', () => {
        const fragment = SQLExpression.between('intField', 18, 65);

        expect(fragment.sql).toBe('?? BETWEEN ? AND ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['number_field', 18, 65]);
      });

      it('generates BETWEEN clause with dates', () => {
        const date1 = new Date('2024-01-01');
        const date2 = new Date('2024-12-31');
        const fragment = SQLExpression.between('dateField', date1, date2);

        expect(fragment.sql).toBe('?? BETWEEN ? AND ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['date_field', date1, date2]);
      });

      it('generates BETWEEN clause with strings', () => {
        const fragment = SQLExpression.between('stringField', 'A', 'Z');

        expect(fragment.sql).toBe('?? BETWEEN ? AND ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field', 'A', 'Z']);
      });

      it('accepts a SQLFragment expression', () => {
        const fragment = SQLExpression.between(sql<TestFields>`${entityField('intField')}`, 1, 100);
        expect(fragment.sql).toBe('?? BETWEEN ? AND ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['number_field', 1, 100]);
      });
    });

    describe(SQLExpression.notBetween, () => {
      it('generates NOT BETWEEN clause with numbers', () => {
        const fragment = SQLExpression.notBetween('intField', 18, 65);

        expect(fragment.sql).toBe('?? NOT BETWEEN ? AND ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['number_field', 18, 65]);
      });

      it('generates NOT BETWEEN clause with dates', () => {
        const date1 = new Date('2024-01-01');
        const date2 = new Date('2024-12-31');
        const fragment = SQLExpression.notBetween('dateField', date1, date2);

        expect(fragment.sql).toBe('?? NOT BETWEEN ? AND ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['date_field', date1, date2]);
      });

      it('accepts a SQLFragment expression', () => {
        const fragment = SQLExpression.notBetween(
          sql<TestFields>`${entityField('intField')}`,
          1,
          100,
        );
        expect(fragment.sql).toBe('?? NOT BETWEEN ? AND ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['number_field', 1, 100]);
      });
    });

    describe(SQLExpression.like, () => {
      it('generates LIKE clause', () => {
        const fragment = SQLExpression.like('stringField', '%John%');

        expect(fragment.sql).toBe('?? LIKE ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field', '%John%']);
      });

      it('accepts a SQLFragment expression', () => {
        const fragment = SQLExpression.like(
          sql<TestFields>`${entityField('stringField')}`,
          '%John%',
        );
        expect(fragment.sql).toBe('?? LIKE ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field', '%John%']);
      });
    });

    describe(SQLExpression.notLike, () => {
      it('generates NOT LIKE clause', () => {
        const fragment = SQLExpression.notLike('stringField', '%test%');

        expect(fragment.sql).toBe('?? NOT LIKE ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field', '%test%']);
      });

      it('accepts a SQLFragment expression', () => {
        const fragment = SQLExpression.notLike(
          sql<TestFields>`${entityField('stringField')}`,
          '%test%',
        );
        expect(fragment.sql).toBe('?? NOT LIKE ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field', '%test%']);
      });
    });

    describe(SQLExpression.ilike, () => {
      it('generates ILIKE clause for case-insensitive matching', () => {
        const fragment = SQLExpression.ilike('testIndexedField', '%@example.com');

        expect(fragment.sql).toBe('?? ILIKE ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual([
          'test_index',
          '%@example.com',
        ]);
      });

      it('accepts a SQLFragment expression', () => {
        const fragment = SQLExpression.ilike(
          sql<TestFields>`${entityField('testIndexedField')}`,
          '%@example.com',
        );
        expect(fragment.sql).toBe('?? ILIKE ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual([
          'test_index',
          '%@example.com',
        ]);
      });
    });

    describe(SQLExpression.notIlike, () => {
      it('generates NOT ILIKE clause for case-insensitive non-matching', () => {
        const fragment = SQLExpression.notIlike('testIndexedField', '%@spam.com');

        expect(fragment.sql).toBe('?? NOT ILIKE ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['test_index', '%@spam.com']);
      });

      it('accepts a SQLFragment expression', () => {
        const fragment = SQLExpression.notIlike(
          sql<TestFields>`${entityField('testIndexedField')}`,
          '%@spam.com',
        );
        expect(fragment.sql).toBe('?? NOT ILIKE ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['test_index', '%@spam.com']);
      });
    });

    describe(SQLExpression.isNull, () => {
      it('generates IS NULL', () => {
        const fragment = SQLExpression.isNull('nullableField');

        expect(fragment.sql).toBe('?? IS NULL');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['nullable_field']);
      });

      it('accepts a SQLFragment expression', () => {
        const fragment = SQLExpression.isNull(sql<TestFields>`${entityField('nullableField')}`);
        expect(fragment.sql).toBe('?? IS NULL');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['nullable_field']);
      });
    });

    describe(SQLExpression.isNotNull, () => {
      it('generates IS NOT NULL', () => {
        const fragment = SQLExpression.isNotNull('testIndexedField');

        expect(fragment.sql).toBe('?? IS NOT NULL');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['test_index']);
      });

      it('accepts a SQLFragment expression', () => {
        const fragment = SQLExpression.isNotNull(
          sql<TestFields>`${entityField('testIndexedField')}`,
        );
        expect(fragment.sql).toBe('?? IS NOT NULL');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['test_index']);
      });
    });

    describe(SQLExpression.eq, () => {
      it('generates equality check', () => {
        const fragment = SQLExpression.eq('stringField', 'active');

        expect(fragment.sql).toBe('?? = ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field', 'active']);
      });

      it('handles null in equality check', () => {
        const fragment = SQLExpression.eq('nullableField', null);

        expect(fragment.sql).toBe('?? IS NULL');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['nullable_field']);
      });

      it('handles undefined in equality check', () => {
        const fragment = SQLExpression.eq('nullableField', undefined);

        expect(fragment.sql).toBe('?? IS NULL');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['nullable_field']);
      });

      it('accepts a SQLFragment expression', () => {
        const fragment = SQLExpression.eq(sql<TestFields>`${entityField('stringField')}`, 'active');
        expect(fragment.sql).toBe('?? = ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field', 'active']);
      });

      it('accepts a SQLChainableFragment and constrains value type', () => {
        const fragment = SQLExpression.eq(
          SQLExpression.trim<TestFields, 'stringField'>('stringField'),
          'trimmed',
        );
        expect(fragment.sql).toBe('TRIM(??) = ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field', 'trimmed']);
      });
    });

    describe(SQLExpression.neq, () => {
      it('generates inequality check', () => {
        const fragment = SQLExpression.neq('stringField', 'deleted');

        expect(fragment.sql).toBe('?? != ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field', 'deleted']);
      });

      it('handles null in inequality check', () => {
        const fragment = SQLExpression.neq('nullableField', null);

        expect(fragment.sql).toBe('?? IS NOT NULL');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['nullable_field']);
      });

      it('handles undefined in inequality check', () => {
        const fragment = SQLExpression.neq('nullableField', undefined);

        expect(fragment.sql).toBe('?? IS NOT NULL');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['nullable_field']);
      });

      it('accepts a SQLFragment expression', () => {
        const fragment = SQLExpression.neq(
          sql<TestFields>`${entityField('stringField')}`,
          'deleted',
        );
        expect(fragment.sql).toBe('?? != ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field', 'deleted']);
      });
    });

    describe(SQLExpression.gt, () => {
      it('generates greater than', () => {
        const fragment = SQLExpression.gt('intField', 18);

        expect(fragment.sql).toBe('?? > ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['number_field', 18]);
      });

      it('accepts a SQLFragment expression', () => {
        const fragment = SQLExpression.gt(sql<TestFields>`${entityField('intField')}`, 18);
        expect(fragment.sql).toBe('?? > ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['number_field', 18]);
      });
    });

    describe(SQLExpression.gte, () => {
      it('generates greater than or equal', () => {
        const fragment = SQLExpression.gte('intField', 18);

        expect(fragment.sql).toBe('?? >= ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['number_field', 18]);
      });

      it('accepts a SQLFragment expression', () => {
        const fragment = SQLExpression.gte(sql<TestFields>`${entityField('intField')}`, 18);
        expect(fragment.sql).toBe('?? >= ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['number_field', 18]);
      });
    });

    describe(SQLExpression.lt, () => {
      it('generates less than', () => {
        const fragment = SQLExpression.lt('intField', 65);

        expect(fragment.sql).toBe('?? < ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['number_field', 65]);
      });

      it('accepts a SQLFragment expression', () => {
        const fragment = SQLExpression.lt(sql<TestFields>`${entityField('intField')}`, 65);
        expect(fragment.sql).toBe('?? < ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['number_field', 65]);
      });
    });

    describe(SQLExpression.lte, () => {
      it('generates less than or equal', () => {
        const fragment = SQLExpression.lte('intField', 65);

        expect(fragment.sql).toBe('?? <= ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['number_field', 65]);
      });

      it('accepts a SQLFragment expression', () => {
        const fragment = SQLExpression.lte(sql<TestFields>`${entityField('intField')}`, 65);
        expect(fragment.sql).toBe('?? <= ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['number_field', 65]);
      });
    });

    describe(SQLExpression.jsonContains, () => {
      it('generates JSON contains', () => {
        const fragment = SQLExpression.jsonContains('stringField', { premium: true });

        expect(fragment.sql).toBe('?? @> ?::jsonb');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual([
          'string_field',
          '{"premium":true}',
        ]);
      });

      it('generates JSON contains for null and undefined values', () => {
        const fragmentNull = SQLExpression.jsonContains('stringField', null);
        const fragmentUndefined = SQLExpression.jsonContains('stringField', undefined);

        expect(fragmentNull.sql).toBe('?? @> ?::jsonb');
        expect(fragmentNull.getKnexBindings(getColumnForField)).toEqual(['string_field', 'null']);

        expect(fragmentUndefined.sql).toBe('?? @> ?::jsonb');
        expect(fragmentUndefined.getKnexBindings(getColumnForField)).toEqual([
          'string_field',
          undefined,
        ]);
      });

      it('throws when value is not JSON-serializable', () => {
        expect(() => SQLExpression.jsonContains('stringField', (() => {}) as any)).toThrow(
          'jsonContains: value is not JSON-serializable',
        );
      });

      it('accepts a SQLFragment expression', () => {
        const fragment = SQLExpression.jsonContains(
          sql<TestFields>`${entityField('stringField')}`,
          { premium: true },
        );
        expect(fragment.sql).toBe('?? @> ?::jsonb');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual([
          'string_field',
          '{"premium":true}',
        ]);
      });
    });

    describe(SQLExpression.jsonContainedBy, () => {
      it('generates JSON contained by', () => {
        const fragment = SQLExpression.jsonContainedBy('stringField', {
          theme: 'dark',
          lang: 'en',
        });

        expect(fragment.sql).toBe('?? <@ ?::jsonb');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual([
          'string_field',
          '{"theme":"dark","lang":"en"}',
        ]);
      });

      it('generates JSON contained by for null and undefined values', () => {
        const fragmentNull = SQLExpression.jsonContainedBy('stringField', null);
        const fragmentUndefined = SQLExpression.jsonContainedBy('stringField', undefined);

        expect(fragmentNull.sql).toBe('?? <@ ?::jsonb');
        expect(fragmentNull.getKnexBindings(getColumnForField)).toEqual(['string_field', 'null']);

        expect(fragmentUndefined.sql).toBe('?? <@ ?::jsonb');
        expect(fragmentUndefined.getKnexBindings(getColumnForField)).toEqual([
          'string_field',
          undefined,
        ]);
      });

      it('throws when value is not JSON-serializable', () => {
        expect(() => SQLExpression.jsonContainedBy('stringField', (() => {}) as any)).toThrow(
          'jsonContainedBy: value is not JSON-serializable',
        );
      });

      it('accepts a SQLFragment expression', () => {
        const fragment = SQLExpression.jsonContainedBy(
          sql<TestFields>`${entityField('stringField')}`,
          { theme: 'dark' },
        );
        expect(fragment.sql).toBe('?? <@ ?::jsonb');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual([
          'string_field',
          '{"theme":"dark"}',
        ]);
      });
    });

    describe(SQLExpression.jsonPath, () => {
      it('generates JSON path access', () => {
        const fragment = SQLExpression.jsonPath('stringField', 'user');

        expect(fragment.sql).toBe(`??->?`);
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field', 'user']);
      });

      it('accepts a SQLFragment expression', () => {
        const fragment = SQLExpression.jsonPath(
          sql<TestFields>`${entityField('stringField')}`,
          'user',
        );
        expect(fragment.sql).toBe('??->?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field', 'user']);
      });
    });

    describe(SQLExpression.jsonPathText, () => {
      it('generates JSON path text access', () => {
        const fragment = SQLExpression.jsonPathText('stringField', 'email');

        expect(fragment.sql).toBe(`??->>?`);
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field', 'email']);
      });

      it('accepts a SQLFragment expression', () => {
        const fragment = SQLExpression.jsonPathText(
          sql<TestFields>`${entityField('stringField')}`,
          'email',
        );
        expect(fragment.sql).toBe('??->>?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field', 'email']);
      });
    });

    describe(SQLExpression.and, () => {
      it('combines conditions with AND', () => {
        const cond1 = sql`age >= ${18}`;
        const cond2 = sql`status = ${'active'}`;
        const fragment = SQLExpression.and(cond1, cond2);

        expect(fragment.sql).toBe('(age >= ?) AND (status = ?)');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual([18, 'active']);
      });

      it('handles single condition in AND', () => {
        const cond = sql`age >= ${18}`;
        const fragment = SQLExpression.and(cond);

        expect(fragment.sql).toBe('(age >= ?)');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual([18]);
      });

      it('handles empty conditions in AND', () => {
        const fragment = SQLExpression.and();

        expect(fragment.sql).toBe('TRUE');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual([]);
      });
    });

    describe(SQLExpression.or, () => {
      it('combines conditions with OR', () => {
        const cond1 = sql`status = ${'active'}`;
        const cond2 = sql`status = ${'pending'}`;
        const fragment = SQLExpression.or(cond1, cond2);

        expect(fragment.sql).toBe('(status = ?) OR (status = ?)');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['active', 'pending']);
      });

      it('handles single condition in OR', () => {
        const cond = sql`status = ${'active'}`;
        const fragment = SQLExpression.or(cond);

        expect(fragment.sql).toBe('(status = ?)');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['active']);
      });

      it('handles empty conditions in OR', () => {
        const fragment = SQLExpression.or();

        expect(fragment.sql).toBe('FALSE');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual([]);
      });
    });

    describe(SQLExpression.not, () => {
      it('negates conditions with NOT', () => {
        const cond = sql`status = ${'deleted'}`;
        const fragment = SQLExpression.not(cond);

        expect(fragment.sql).toBe('NOT (status = ?)');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['deleted']);
      });
    });

    describe(SQLExpression.group, () => {
      it('groups conditions with parentheses', () => {
        const cond = sql`age >= ${18} AND age <= ${65}`;
        const fragment = SQLExpression.group(cond);

        expect(fragment.sql).toBe('(age >= ? AND age <= ?)');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual([18, 65]);
      });
    });

    describe('complex combinations', () => {
      it('builds complex queries with multiple helpers', () => {
        const fragment = SQLExpression.and<TestFields>(
          SQLExpression.between('intField', 18, 65),
          SQLExpression.group(
            SQLExpression.or(
              SQLExpression.inArray('stringField', ['active', 'premium']),
              sql`role = ${'admin'}`,
            ),
          ),
          SQLExpression.isNotNull('testIndexedField'),
        );

        expect(fragment.sql).toBe(
          '(?? BETWEEN ? AND ?) AND (((?? IN (?, ?)) OR (role = ?))) AND (?? IS NOT NULL)',
        );
        expect(fragment.getKnexBindings(getColumnForField)).toEqual([
          'number_field',
          18,
          65,
          'string_field',
          'active',
          'premium',
          'admin',
          'test_index',
        ]);
      });
    });
  });

  describe(SQLChainableFragment, () => {
    // Use direct SQLChainableFragment construction to test fluent methods in isolation,
    // without going through helpers like trim() or cast().
    const makeExpr = <TValue extends SupportedSQLValue>(
      fragment: SQLFragment<TestFields>,
    ): SQLChainableFragment<TestFields, TValue> =>
      new SQLChainableFragment(fragment.sql, fragment.bindings);

    const stringFieldFragment = (): SQLFragment<TestFields> => sql`${entityField('stringField')}`;
    const intFieldFragment = (): SQLFragment<TestFields> => sql`${entityField('intField')}`;

    describe('comparison methods', () => {
      it('eq(value)', () => {
        const fragment = makeExpr<string>(stringFieldFragment()).eq('active');
        expect(fragment.sql).toBe('?? = ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field', 'active']);
      });

      it('eq(null) uses IS NULL', () => {
        const fragment = makeExpr<string>(stringFieldFragment()).eq(null);
        expect(fragment.sql).toBe('?? IS NULL');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field']);
      });

      it('eq(undefined) uses IS NULL', () => {
        const fragment = makeExpr<string>(stringFieldFragment()).eq(undefined);
        expect(fragment.sql).toBe('?? IS NULL');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field']);
      });

      it('neq(value)', () => {
        const fragment = makeExpr<string>(stringFieldFragment()).neq('deleted');
        expect(fragment.sql).toBe('?? != ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field', 'deleted']);
      });

      it('neq(null) uses IS NOT NULL', () => {
        const fragment = makeExpr<string>(stringFieldFragment()).neq(null);
        expect(fragment.sql).toBe('?? IS NOT NULL');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field']);
      });

      it('neq(undefined) uses IS NOT NULL', () => {
        const fragment = makeExpr<string>(stringFieldFragment()).neq(undefined);
        expect(fragment.sql).toBe('?? IS NOT NULL');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field']);
      });

      it('gt(value)', () => {
        const fragment = makeExpr<number>(intFieldFragment()).gt(10);
        expect(fragment.sql).toBe('?? > ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['number_field', 10]);
      });

      it('gte(value)', () => {
        const fragment = makeExpr<number>(intFieldFragment()).gte(10);
        expect(fragment.sql).toBe('?? >= ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['number_field', 10]);
      });

      it('lt(value)', () => {
        const fragment = makeExpr<number>(intFieldFragment()).lt(100);
        expect(fragment.sql).toBe('?? < ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['number_field', 100]);
      });

      it('lte(value)', () => {
        const fragment = makeExpr<number>(intFieldFragment()).lte(100);
        expect(fragment.sql).toBe('?? <= ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['number_field', 100]);
      });

      it('isNull()', () => {
        const fragment = makeExpr<string>(stringFieldFragment()).isNull();
        expect(fragment.sql).toBe('?? IS NULL');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field']);
      });

      it('isNotNull()', () => {
        const fragment = makeExpr<string>(stringFieldFragment()).isNotNull();
        expect(fragment.sql).toBe('?? IS NOT NULL');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field']);
      });
    });

    describe('pattern matching methods', () => {
      it('like(pattern)', () => {
        const fragment = makeExpr<string>(stringFieldFragment()).like('%test%');
        expect(fragment.sql).toBe('?? LIKE ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field', '%test%']);
      });

      it('notLike(pattern)', () => {
        const fragment = makeExpr<string>(stringFieldFragment()).notLike('%test%');
        expect(fragment.sql).toBe('?? NOT LIKE ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field', '%test%']);
      });

      it('ilike(pattern)', () => {
        const fragment = makeExpr<string>(stringFieldFragment()).ilike('%test%');
        expect(fragment.sql).toBe('?? ILIKE ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field', '%test%']);
      });

      it('notIlike(pattern)', () => {
        const fragment = makeExpr<string>(stringFieldFragment()).notIlike('%test%');
        expect(fragment.sql).toBe('?? NOT ILIKE ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field', '%test%']);
      });
    });

    describe('collection methods', () => {
      it('inArray(values)', () => {
        const fragment = makeExpr<string>(stringFieldFragment()).inArray(['a', 'b']);
        expect(fragment.sql).toBe('?? IN (?, ?)');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field', 'a', 'b']);
      });

      it('inArray([]) returns always-false', () => {
        const fragment = makeExpr<string>(stringFieldFragment()).inArray([]);
        expect(fragment.sql).toBe('FALSE');
      });

      it('notInArray(values)', () => {
        const fragment = makeExpr<string>(stringFieldFragment()).notInArray(['x']);
        expect(fragment.sql).toBe('?? NOT IN (?)');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field', 'x']);
      });

      it('notInArray([]) returns always-true', () => {
        const fragment = makeExpr<string>(stringFieldFragment()).notInArray([]);
        expect(fragment.sql).toBe('TRUE');
      });

      it('anyArray(values)', () => {
        const fragment = makeExpr<string>(stringFieldFragment()).anyArray(['a', 'b']);
        expect(fragment.sql).toBe('?? = ANY(?)');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field', ['a', 'b']]);
      });

      it('anyArray([]) returns always-false', () => {
        const fragment = makeExpr<string>(stringFieldFragment()).anyArray([]);
        expect(fragment.sql).toBe('FALSE');
      });
    });

    describe('range methods', () => {
      it('between(min, max)', () => {
        const fragment = makeExpr<number>(intFieldFragment()).between(1, 100);
        expect(fragment.sql).toBe('?? BETWEEN ? AND ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['number_field', 1, 100]);
      });

      it('notBetween(min, max)', () => {
        const fragment = makeExpr<number>(intFieldFragment()).notBetween(1, 100);
        expect(fragment.sql).toBe('?? NOT BETWEEN ? AND ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['number_field', 1, 100]);
      });
    });

    describe('helpers that return SQLChainableFragment', () => {
      it('jsonPath returns an SQLChainableFragment with correct base SQL', () => {
        const expr = SQLExpression.jsonPath('stringField', 'key');
        expect(expr).toBeInstanceOf(SQLChainableFragment);
        expect(expr.sql).toBe('??->?');
        expect(expr.getKnexBindings(getColumnForField)).toEqual(['string_field', 'key']);
      });

      it('jsonPathText returns an SQLChainableFragment with correct base SQL', () => {
        const expr = SQLExpression.jsonPathText('stringField', 'email');
        expect(expr).toBeInstanceOf(SQLChainableFragment);
        expect(expr.sql).toBe('??->>?');
        expect(expr.getKnexBindings(getColumnForField)).toEqual(['string_field', 'email']);
      });

      it('jsonDeepPath returns an SQLChainableFragment with correct base SQL', () => {
        const expr = SQLExpression.jsonDeepPath('stringField', ['user', 'address', 'city']);
        expect(expr).toBeInstanceOf(SQLChainableFragment);
        expect(expr.sql).toBe('?? #> ?');
        expect(expr.getKnexBindings(getColumnForField)).toEqual([
          'string_field',
          '{user,address,city}',
        ]);
      });

      it('jsonDeepPath properly quotes path elements with special characters', () => {
        const fragment = SQLExpression.jsonDeepPath('stringField', ['user', 'first,last', 'na}me']);

        expect(fragment.getKnexBindings(getColumnForField)).toEqual([
          'string_field',
          '{user,"first,last","na}me"}',
        ]);
      });

      it('jsonDeepPath properly quotes empty path elements', () => {
        const fragment = SQLExpression.jsonDeepPath('stringField', ['user', '']);

        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field', '{user,""}']);
      });

      it('jsonDeepPath properly escapes quotes and backslashes in path elements', () => {
        const fragment = SQLExpression.jsonDeepPath('stringField', [
          'key"with"quotes',
          'back\\slash',
        ]);

        expect(fragment.getKnexBindings(getColumnForField)).toEqual([
          'string_field',
          '{"key\\"with\\"quotes","back\\\\slash"}',
        ]);
      });

      it('jsonDeepPath accepts a SQLFragment expression', () => {
        const expr = SQLExpression.jsonDeepPath(sql<TestFields>`${entityField('stringField')}`, [
          'user',
          'city',
        ]);
        expect(expr).toBeInstanceOf(SQLChainableFragment);
        expect(expr.sql).toBe('?? #> ?');
        expect(expr.getKnexBindings(getColumnForField)).toEqual(['string_field', '{user,city}']);
      });

      it('jsonDeepPathText returns an SQLChainableFragment with correct base SQL', () => {
        const expr = SQLExpression.jsonDeepPathText('stringField', ['user', 'address', 'city']);
        expect(expr).toBeInstanceOf(SQLChainableFragment);
        expect(expr.sql).toBe('?? #>> ?');
        expect(expr.getKnexBindings(getColumnForField)).toEqual([
          'string_field',
          '{user,address,city}',
        ]);
      });

      it('jsonDeepPathText accepts a SQLFragment expression', () => {
        const expr = SQLExpression.jsonDeepPathText(
          sql<TestFields>`${entityField('stringField')}`,
          ['user', 'city'],
        );
        expect(expr).toBeInstanceOf(SQLChainableFragment);
        expect(expr.sql).toBe('?? #>> ?');
        expect(expr.getKnexBindings(getColumnForField)).toEqual(['string_field', '{user,city}']);
      });

      it('cast returns an SQLChainableFragment with correct base SQL', () => {
        const jsonExpr = SQLExpression.jsonPath('stringField', 'count');
        const expr = SQLExpression.cast(jsonExpr, 'int');
        expect(expr).toBeInstanceOf(SQLChainableFragment);
        expect(expr.sql).toBe('(??->?)::int');
        expect(expr.getKnexBindings(getColumnForField)).toEqual(['string_field', 'count']);
      });

      it('cast accepts a field name', () => {
        const expr = SQLExpression.cast('intField', 'text');
        expect(expr).toBeInstanceOf(SQLChainableFragment);
        expect(expr.sql).toBe('(??)::text');
        expect(expr.getKnexBindings(getColumnForField)).toEqual(['number_field']);
      });

      it('cast rejects unsupported type names', () => {
        const expr = SQLExpression.jsonPath('stringField', 'count');
        expect(() => SQLExpression.cast(expr, 'int; DROP TABLE users' as any)).toThrow(
          'cast: unsupported type name',
        );
      });

      it('coalesce returns an SQLChainableFragment with correct base SQL', () => {
        const expr = SQLExpression.coalesce<TestFields>(
          sql`${entityField('nullableField')}`,
          'default',
        );
        expect(expr).toBeInstanceOf(SQLChainableFragment);
        expect(expr.sql).toBe('COALESCE(??, ?)');
        expect(expr.getKnexBindings(getColumnForField)).toEqual(['nullable_field', 'default']);
      });

      it('coalesce with multiple expressions', () => {
        const fragment = SQLExpression.coalesce<TestFields>(
          sql`${entityField('nullableField')}`,
          sql`${entityField('stringField')}`,
          'fallback',
        );
        expect(fragment.sql).toBe('COALESCE(??, ??, ?)');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual([
          'nullable_field',
          'string_field',
          'fallback',
        ]);
      });

      it('lower returns an SQLChainableFragment with correct base SQL', () => {
        const expr = SQLExpression.lower('stringField');
        expect(expr).toBeInstanceOf(SQLChainableFragment);
        expect(expr.sql).toBe('LOWER(??)');
        expect(expr.getKnexBindings(getColumnForField)).toEqual(['string_field']);
      });

      it('lower accepts a SQLFragment', () => {
        const fragment = SQLExpression.lower(
          SQLExpression.jsonPathText<TestFields, 'stringField'>('stringField', 'email'),
        );
        expect(fragment.sql).toBe('LOWER(??->>?)');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field', 'email']);
      });

      it('upper returns an SQLChainableFragment with correct base SQL', () => {
        const expr = SQLExpression.upper('stringField');
        expect(expr).toBeInstanceOf(SQLChainableFragment);
        expect(expr.sql).toBe('UPPER(??)');
        expect(expr.getKnexBindings(getColumnForField)).toEqual(['string_field']);
      });

      it('upper accepts a SQLFragment', () => {
        const fragment = SQLExpression.upper(
          SQLExpression.jsonPathText<TestFields, 'stringField'>('stringField', 'email'),
        );
        expect(fragment.sql).toBe('UPPER(??->>?)');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field', 'email']);
      });

      it('trim returns an SQLChainableFragment with correct base SQL', () => {
        const expr = SQLExpression.trim('stringField');
        expect(expr).toBeInstanceOf(SQLChainableFragment);
        expect(expr.sql).toBe('TRIM(??)');
        expect(expr.getKnexBindings(getColumnForField)).toEqual(['string_field']);
      });

      it('trim accepts a SQLFragment', () => {
        const fragment = SQLExpression.trim(
          SQLExpression.jsonPathText<TestFields, 'stringField'>('stringField', 'name'),
        );
        expect(fragment.sql).toBe('TRIM(??->>?)');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field', 'name']);
      });

      it('SQLChainableFragment still works as a SQLFragment in sql template', () => {
        const path = SQLExpression.jsonPath('stringField', 'key');
        const fragment = sql`${path} IS NOT NULL`;

        expect(fragment.sql).toBe('??->? IS NOT NULL');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field', 'key']);
      });
    });

    describe('composing multiple expression helpers', () => {
      it('lower(trim(field)).eq(value)', () => {
        const fragment = SQLExpression.lower(
          SQLExpression.trim(sql<TestFields>`${entityField('stringField')}`),
        ).eq('hello');

        expect(fragment.sql).toBe('LOWER(TRIM(??)) = ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field', 'hello']);
      });

      it('cast(jsonDeepPath(...), type).gt(value)', () => {
        const fragment = SQLExpression.cast(
          SQLExpression.jsonDeepPath<TestFields, 'stringField'>('stringField', ['stats', 'count']),
          'int',
        ).gt(10);

        expect(fragment.sql).toBe('(?? #> ?)::int > ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual([
          'string_field',
          '{stats,count}',
          10,
        ]);
      });

      it('coalesce(jsonPathText(...), default).ilike(pattern)', () => {
        const fragment = SQLExpression.coalesce(
          SQLExpression.jsonPathText<TestFields, 'stringField'>('stringField', 'name'),
          '',
        ).ilike('%test%');

        expect(fragment.sql).toBe('COALESCE(??->>?, ?) ILIKE ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual([
          'string_field',
          'name',
          '',
          '%test%',
        ]);
      });
    });
  });
});

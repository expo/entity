import { getDatabaseFieldForEntityField } from '@expo/entity';
import { describe, expect, it } from '@jest/globals';

import {
  entityField,
  identifier,
  unsafeRaw,
  sql,
  SQLEntityField,
  SQLFragment,
  SQLFragmentHelpers,
  SQLIdentifier,
} from '../SQLOperator';
import { TestFields, testEntityConfiguration } from './fixtures/TestEntity';

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
          fragments.push(sql`WHERE ${SQLFragmentHelpers.and(...filters)}`);
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
      const field = entityField<TestFields>('stringField');
      expect(field.fieldName).toBe('stringField');
    });

    it('uses ?? placeholder in SQL fragments', () => {
      const fragment = sql`SELECT ${entityField<TestFields>('stringField')} FROM users`;

      expect(fragment.sql).toBe('SELECT ?? FROM users');
      expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field']);
    });

    it('translates entity field name to database column name via getKnexBindings', () => {
      const fragment = sql`WHERE ${entityField<TestFields>('intField')} = ${42}`;

      expect(fragment.sql).toBe('WHERE ?? = ?');
      expect(fragment.getKnexBindings(getColumnForField)).toEqual(['number_field', 42]);
    });

    it('translates the id field correctly', () => {
      const fragment = sql`WHERE ${entityField<TestFields>('customIdField')} = ${'some-id'}`;

      expect(fragment.sql).toBe('WHERE ?? = ?');
      expect(fragment.getKnexBindings(getColumnForField)).toEqual(['custom_id', 'some-id']);
    });

    it('works alongside identifiers and values', () => {
      const fragment = sql`SELECT ${identifier('table_name')}.${entityField<TestFields>('stringField')} WHERE ${entityField<TestFields>('intField')} > ${10}`;

      expect(fragment.sql).toBe('SELECT ??.?? WHERE ?? > ?');
      expect(fragment.getKnexBindings(getColumnForField)).toEqual([
        'table_name',
        'string_field',
        'number_field',
        10,
      ]);
    });

    it('works with multiple entity fields', () => {
      const fragment = sql`SELECT ${entityField<TestFields>('stringField')}, ${entityField<TestFields>('intField')}, ${entityField<TestFields>('dateField')} FROM test`;

      expect(fragment.sql).toBe('SELECT ??, ??, ?? FROM test');
      expect(fragment.getKnexBindings(getColumnForField)).toEqual([
        'string_field',
        'number_field',
        'date_field',
      ]);
    });

    it('works in nested SQL fragments', () => {
      const inner = sql`${entityField<TestFields>('stringField')} = ${'hello'}`;
      const outer = sql`SELECT * FROM test WHERE ${inner}`;

      expect(outer.sql).toBe('SELECT * FROM test WHERE ?? = ?');
      expect(outer.getKnexBindings(getColumnForField)).toEqual(['string_field', 'hello']);
    });
  });

  describe('SQLFragmentHelpers', () => {
    describe(SQLFragmentHelpers.inArray, () => {
      it('generates IN clause with values', () => {
        const fragment = SQLFragmentHelpers.inArray('stringField', ['active', 'pending']);

        expect(fragment.sql).toBe('?? IN (?, ?)');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual([
          'string_field',
          'active',
          'pending',
        ]);
      });

      it('handles empty array', () => {
        const fragment = SQLFragmentHelpers.inArray('stringField', []);

        expect(fragment.sql).toBe('1 = 0'); // Always false
        expect(fragment.getKnexBindings(getColumnForField)).toEqual([]);
      });
    });

    describe(SQLFragmentHelpers.notInArray, () => {
      it('generates NOT IN clause with values', () => {
        const fragment = SQLFragmentHelpers.notInArray('stringField', ['deleted', 'archived']);

        expect(fragment.sql).toBe('?? NOT IN (?, ?)');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual([
          'string_field',
          'deleted',
          'archived',
        ]);
      });

      it('handles empty array', () => {
        const fragment = SQLFragmentHelpers.notInArray('stringField', []);

        expect(fragment.sql).toBe('1 = 1'); // Always true
        expect(fragment.getKnexBindings(getColumnForField)).toEqual([]);
      });
    });

    describe(SQLFragmentHelpers.between, () => {
      it('generates BETWEEN clause with numbers', () => {
        const fragment = SQLFragmentHelpers.between('intField', 18, 65);

        expect(fragment.sql).toBe('?? BETWEEN ? AND ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['number_field', 18, 65]);
      });

      it('generates BETWEEN clause with dates', () => {
        const date1 = new Date('2024-01-01');
        const date2 = new Date('2024-12-31');
        const fragment = SQLFragmentHelpers.between('dateField', date1, date2);

        expect(fragment.sql).toBe('?? BETWEEN ? AND ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['date_field', date1, date2]);
      });

      it('generates BETWEEN clause with strings', () => {
        const fragment = SQLFragmentHelpers.between('stringField', 'A', 'Z');

        expect(fragment.sql).toBe('?? BETWEEN ? AND ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field', 'A', 'Z']);
      });
    });

    describe(SQLFragmentHelpers.notBetween, () => {
      it('generates NOT BETWEEN clause with numbers', () => {
        const fragment = SQLFragmentHelpers.notBetween('intField', 18, 65);

        expect(fragment.sql).toBe('?? NOT BETWEEN ? AND ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['number_field', 18, 65]);
      });

      it('generates NOT BETWEEN clause with dates', () => {
        const date1 = new Date('2024-01-01');
        const date2 = new Date('2024-12-31');
        const fragment = SQLFragmentHelpers.notBetween('dateField', date1, date2);

        expect(fragment.sql).toBe('?? NOT BETWEEN ? AND ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['date_field', date1, date2]);
      });
    });

    describe(SQLFragmentHelpers.like, () => {
      it('generates LIKE clause', () => {
        const fragment = SQLFragmentHelpers.like('stringField', '%John%');

        expect(fragment.sql).toBe('?? LIKE ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field', '%John%']);
      });
    });

    describe(SQLFragmentHelpers.notLike, () => {
      it('generates NOT LIKE clause', () => {
        const fragment = SQLFragmentHelpers.notLike('stringField', '%test%');

        expect(fragment.sql).toBe('?? NOT LIKE ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field', '%test%']);
      });
    });

    describe(SQLFragmentHelpers.ilike, () => {
      it('generates ILIKE clause for case-insensitive matching', () => {
        const fragment = SQLFragmentHelpers.ilike('testIndexedField', '%@example.com');

        expect(fragment.sql).toBe('?? ILIKE ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual([
          'test_index',
          '%@example.com',
        ]);
      });
    });

    describe(SQLFragmentHelpers.notIlike, () => {
      it('generates NOT ILIKE clause for case-insensitive non-matching', () => {
        const fragment = SQLFragmentHelpers.notIlike('testIndexedField', '%@spam.com');

        expect(fragment.sql).toBe('?? NOT ILIKE ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['test_index', '%@spam.com']);
      });
    });

    describe(SQLFragmentHelpers.isNull, () => {
      it('generates IS NULL', () => {
        const fragment = SQLFragmentHelpers.isNull('nullableField');

        expect(fragment.sql).toBe('?? IS NULL');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['nullable_field']);
      });
    });

    describe(SQLFragmentHelpers.isNotNull, () => {
      it('generates IS NOT NULL', () => {
        const fragment = SQLFragmentHelpers.isNotNull('testIndexedField');

        expect(fragment.sql).toBe('?? IS NOT NULL');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['test_index']);
      });
    });

    describe(SQLFragmentHelpers.eq, () => {
      it('generates equality check', () => {
        const fragment = SQLFragmentHelpers.eq('stringField', 'active');

        expect(fragment.sql).toBe('?? = ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field', 'active']);
      });

      it('handles null in equality check', () => {
        const fragment = SQLFragmentHelpers.eq('nullableField', null);

        expect(fragment.sql).toBe('?? IS NULL');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['nullable_field']);
      });

      it('handles undefined in equality check', () => {
        const fragment = SQLFragmentHelpers.eq('nullableField', undefined);

        expect(fragment.sql).toBe('?? IS NULL');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['nullable_field']);
      });
    });

    describe(SQLFragmentHelpers.neq, () => {
      it('generates inequality check', () => {
        const fragment = SQLFragmentHelpers.neq('stringField', 'deleted');

        expect(fragment.sql).toBe('?? != ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field', 'deleted']);
      });

      it('handles null in inequality check', () => {
        const fragment = SQLFragmentHelpers.neq('nullableField', null);

        expect(fragment.sql).toBe('?? IS NOT NULL');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['nullable_field']);
      });

      it('handles undefined in inequality check', () => {
        const fragment = SQLFragmentHelpers.neq('nullableField', undefined);

        expect(fragment.sql).toBe('?? IS NOT NULL');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['nullable_field']);
      });
    });

    describe(SQLFragmentHelpers.gt, () => {
      it('generates greater than', () => {
        const fragment = SQLFragmentHelpers.gt('intField', 18);

        expect(fragment.sql).toBe('?? > ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['number_field', 18]);
      });
    });

    describe(SQLFragmentHelpers.gte, () => {
      it('generates greater than or equal', () => {
        const fragment = SQLFragmentHelpers.gte('intField', 18);

        expect(fragment.sql).toBe('?? >= ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['number_field', 18]);
      });
    });

    describe(SQLFragmentHelpers.lt, () => {
      it('generates less than', () => {
        const fragment = SQLFragmentHelpers.lt('intField', 65);

        expect(fragment.sql).toBe('?? < ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['number_field', 65]);
      });
    });

    describe(SQLFragmentHelpers.lte, () => {
      it('generates less than or equal', () => {
        const fragment = SQLFragmentHelpers.lte('intField', 65);

        expect(fragment.sql).toBe('?? <= ?');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['number_field', 65]);
      });
    });

    describe(SQLFragmentHelpers.jsonContains, () => {
      it('generates JSON contains', () => {
        const fragment = SQLFragmentHelpers.jsonContains('stringField', { premium: true });

        expect(fragment.sql).toBe('?? @> ?::jsonb');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual([
          'string_field',
          '{"premium":true}',
        ]);
      });
    });

    describe(SQLFragmentHelpers.jsonContainedBy, () => {
      it('generates JSON contained by', () => {
        const fragment = SQLFragmentHelpers.jsonContainedBy('stringField', {
          theme: 'dark',
          lang: 'en',
        });

        expect(fragment.sql).toBe('?? <@ ?::jsonb');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual([
          'string_field',
          '{"theme":"dark","lang":"en"}',
        ]);
      });
    });

    describe(SQLFragmentHelpers.jsonPath, () => {
      it('generates JSON path access', () => {
        const fragment = SQLFragmentHelpers.jsonPath('stringField', 'user');

        expect(fragment.sql).toBe(`??->?`);
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field', 'user']);
      });
    });

    describe(SQLFragmentHelpers.jsonPathText, () => {
      it('generates JSON path text access', () => {
        const fragment = SQLFragmentHelpers.jsonPathText('stringField', 'email');

        expect(fragment.sql).toBe(`??->>?`);
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['string_field', 'email']);
      });
    });

    describe(SQLFragmentHelpers.and, () => {
      it('combines conditions with AND', () => {
        const cond1 = sql`age >= ${18}`;
        const cond2 = sql`status = ${'active'}`;
        const fragment = SQLFragmentHelpers.and(cond1, cond2);

        expect(fragment.sql).toBe('(age >= ?) AND (status = ?)');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual([18, 'active']);
      });

      it('handles single condition in AND', () => {
        const cond = sql`age >= ${18}`;
        const fragment = SQLFragmentHelpers.and(cond);

        expect(fragment.sql).toBe('(age >= ?)');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual([18]);
      });

      it('handles empty conditions in AND', () => {
        const fragment = SQLFragmentHelpers.and();

        expect(fragment.sql).toBe('1 = 1');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual([]);
      });
    });

    describe(SQLFragmentHelpers.or, () => {
      it('combines conditions with OR', () => {
        const cond1 = sql`status = ${'active'}`;
        const cond2 = sql`status = ${'pending'}`;
        const fragment = SQLFragmentHelpers.or(cond1, cond2);

        expect(fragment.sql).toBe('(status = ?) OR (status = ?)');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['active', 'pending']);
      });

      it('handles single condition in OR', () => {
        const cond = sql`status = ${'active'}`;
        const fragment = SQLFragmentHelpers.or(cond);

        expect(fragment.sql).toBe('(status = ?)');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['active']);
      });

      it('handles empty conditions in OR', () => {
        const fragment = SQLFragmentHelpers.or();

        expect(fragment.sql).toBe('1 = 0');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual([]);
      });
    });

    describe(SQLFragmentHelpers.not, () => {
      it('negates conditions with NOT', () => {
        const cond = sql`status = ${'deleted'}`;
        const fragment = SQLFragmentHelpers.not(cond);

        expect(fragment.sql).toBe('NOT (status = ?)');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual(['deleted']);
      });
    });

    describe(SQLFragmentHelpers.group, () => {
      it('groups conditions with parentheses', () => {
        const cond = sql`age >= ${18} AND age <= ${65}`;
        const fragment = SQLFragmentHelpers.group(cond);

        expect(fragment.sql).toBe('(age >= ? AND age <= ?)');
        expect(fragment.getKnexBindings(getColumnForField)).toEqual([18, 65]);
      });
    });

    describe('complex combinations', () => {
      it('builds complex queries with multiple helpers', () => {
        const fragment = SQLFragmentHelpers.and(
          SQLFragmentHelpers.between('intField', 18, 65),
          SQLFragmentHelpers.group(
            SQLFragmentHelpers.or(
              SQLFragmentHelpers.inArray('stringField', ['active', 'premium']),
              sql`role = ${'admin'}`,
            ),
          ),
          SQLFragmentHelpers.isNotNull('testIndexedField'),
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
});

import { describe, expect, it } from '@jest/globals';

import {
  identifier,
  raw,
  sql,
  SQLFragment,
  SQLFragmentHelpers,
  SQLIdentifier,
} from '../SQLOperator';

describe('SQLOperator', () => {
  describe('sql template literal', () => {
    it('handles basic parameterized queries', () => {
      const age = 18;
      const status = 'active';
      const fragment = sql`age >= ${age} AND status = ${status}`;

      expect(fragment.sql).toBe('age >= ? AND status = ?');
      expect(fragment.getKnexBindings()).toEqual([18, 'active']);
    });

    it('handles nested SQL fragments', () => {
      const condition1 = sql`age >= ${18}`;
      const condition2 = sql`status = ${'active'}`;
      const combined = sql`${condition1} AND ${condition2}`;

      expect(combined.sql).toBe('age >= ? AND status = ?');
      expect(combined.getKnexBindings()).toEqual([18, 'active']);
    });

    it('handles SQL identifiers', () => {
      const columnName = 'user_name';
      const fragment = sql`${identifier(columnName)} = ${'John'}`;

      expect(fragment.sql).toBe('?? = ?');
      expect(fragment.getKnexBindings()).toEqual(['user_name', 'John']);
    });

    it('handles arrays for IN clauses', () => {
      const values = ['active', 'pending', 'approved'];
      const fragment = sql`status IN ${values}`;

      expect(fragment.sql).toBe('status IN (?, ?, ?)');
      expect(fragment.getKnexBindings()).toEqual(['active', 'pending', 'approved']);
    });

    it('handles null values', () => {
      const fragment = sql`field = ${null}`;

      expect(fragment.sql).toBe('field = ?');
      expect(fragment.getKnexBindings()).toEqual([null]);
    });

    it('handles empty strings', () => {
      const fragment = sql`field = ${''}`;

      expect(fragment.sql).toBe('field = ?');
      expect(fragment.getKnexBindings()).toEqual(['']);
    });

    it('handles numbers including zero', () => {
      const fragment = sql`count = ${0} OR count = ${42}`;

      expect(fragment.sql).toBe('count = ? OR count = ?');
      expect(fragment.getKnexBindings()).toEqual([0, 42]);
    });

    it('handles boolean values', () => {
      const fragment = sql`active = ${true} AND deleted = ${false}`;

      expect(fragment.sql).toBe('active = ? AND deleted = ?');
      expect(fragment.getKnexBindings()).toEqual([true, false]);
    });

    it('handles raw SQL', () => {
      const columnName = 'created_at';
      const fragment = sql`ORDER BY ${raw(columnName)} DESC`;

      expect(fragment.sql).toBe('ORDER BY created_at DESC');
      expect(fragment.getKnexBindings()).toEqual([]);
    });

    it('handles complex raw SQL expressions', () => {
      const fragment = sql`WHERE ${raw('EXTRACT(year FROM created_at)')} = ${2024}`;

      expect(fragment.sql).toBe('WHERE EXTRACT(year FROM created_at) = ?');
      expect(fragment.getKnexBindings()).toEqual([2024]);
    });

    it('combines raw SQL with regular parameters', () => {
      const sortColumn = 'name';
      const fragment = sql`SELECT * FROM users WHERE age > ${18} ORDER BY ${raw(sortColumn)} ${raw('DESC')}`;

      expect(fragment.sql).toBe('SELECT * FROM users WHERE age > ? ORDER BY name DESC');
      expect(fragment.getKnexBindings()).toEqual([18]);
    });
  });

  describe(SQLFragment, () => {
    describe(SQLFragment.prototype.append, () => {
      it('appends fragments correctly', () => {
        const fragment1 = new SQLFragment('age >= ?', [{ type: 'value', value: 18 }]);
        const fragment2 = new SQLFragment('status = ?', [{ type: 'value', value: 'active' }]);
        const combined = fragment1.append(fragment2);

        expect(combined.sql).toBe('age >= ? status = ?');
        expect(combined.getKnexBindings()).toEqual([18, 'active']);
      });
    });

    describe(SQLFragment.join, () => {
      it('joins fragments with custom separator', () => {
        const fragments = [
          new SQLFragment('name = ?', [{ type: 'value', value: 'Alice' }]),
          new SQLFragment('age = ?', [{ type: 'value', value: 30 }]),
          new SQLFragment('city = ?', [{ type: 'value', value: 'NYC' }]),
        ];
        const joined = SQLFragment.join(fragments, ' AND ');

        expect(joined.sql).toBe('name = ? AND age = ? AND city = ?');
        expect(joined.getKnexBindings()).toEqual(['Alice', 30, 'NYC']);
      });

      it('handles empty array in join', () => {
        const joined = SQLFragment.join([]);

        expect(joined.sql).toBe('');
        expect(joined.getKnexBindings()).toEqual([]);
      });

      it('joins SQL fragments with default separator', () => {
        const columns = [sql`name`, sql`age`, sql`email`];
        const joined = SQLFragment.join(columns);

        expect(joined.sql).toBe('name, age, email');
        expect(joined.getKnexBindings()).toEqual([]);
      });

      it('joins SQL fragments with custom separator', () => {
        const conditions = [sql`age > ${18}`, sql`status = ${'active'}`, sql`verified = ${true}`];
        const joined = SQLFragment.join(conditions, ' AND ');

        expect(joined.sql).toBe('age > ? AND status = ? AND verified = ?');
        expect(joined.getKnexBindings()).toEqual([18, 'active', true]);
      });

      it('handles single fragment', () => {
        const single = [sql`name = ${'Alice'}`];
        const joined = SQLFragment.join(single);

        expect(joined.sql).toBe('name = ?');
        expect(joined.getKnexBindings()).toEqual(['Alice']);
      });
    });

    describe(SQLFragment.concat, () => {
      it('concatenates fragments with space separator', () => {
        const select = new SQLFragment('SELECT * FROM users', []);
        const where = new SQLFragment('WHERE age > ?', [{ type: 'value', value: 18 }]);
        const orderBy = new SQLFragment('ORDER BY name', []);

        const concatenated = SQLFragment.concat(select, where, orderBy);

        expect(concatenated.sql).toBe('SELECT * FROM users WHERE age > ? ORDER BY name');
        expect(concatenated.getKnexBindings()).toEqual([18]);
      });

      it('handles single fragment in concat', () => {
        const fragment = new SQLFragment('SELECT * FROM users', []);
        const concatenated = SQLFragment.concat(fragment);

        expect(concatenated.sql).toBe('SELECT * FROM users');
        expect(concatenated.getKnexBindings()).toEqual([]);
      });

      it('handles empty concat', () => {
        const concatenated = SQLFragment.concat();

        expect(concatenated.sql).toBe('');
        expect(concatenated.getKnexBindings()).toEqual([]);
      });

      it('supports dynamic query building with concat', () => {
        // Build a query dynamically
        const fragments: SQLFragment[] = [sql`SELECT * FROM products`];

        // Conditionally add WHERE clause
        const filters: SQLFragment[] = [];
        filters.push(sql`price > ${100}`);
        filters.push(sql`category = ${'electronics'}`);

        if (filters.length > 0) {
          fragments.push(sql`WHERE ${SQLFragment.join(filters, ' AND ')}`);
        }

        // Add ORDER BY
        fragments.push(sql`ORDER BY created_at DESC`);

        // Add LIMIT
        fragments.push(sql`LIMIT ${10}`);

        const query = SQLFragment.concat(...fragments);

        expect(query.sql).toBe(
          'SELECT * FROM products WHERE price > ? AND category = ? ORDER BY created_at DESC LIMIT ?',
        );
        expect(query.getKnexBindings()).toEqual([100, 'electronics', 10]);
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
      expect(fragment.getKnexBindings()).toEqual(['user"data']);
    });

    it('delegates escaping to Knex for SQL injection prevention', () => {
      const maliciousName = 'id"; DELETE FROM users WHERE "1"="1';
      const fragment = sql`SELECT * FROM ${identifier(maliciousName)}`;
      // The identifier is passed as a binding to Knex which will escape it
      expect(fragment.sql).toBe('SELECT * FROM ??');
      expect(fragment.getKnexBindings()).toEqual(['id"; DELETE FROM users WHERE "1"="1']);
    });
  });

  describe('SQLFragmentHelpers', () => {
    describe(SQLFragmentHelpers.inArray, () => {
      it('generates IN clause with values', () => {
        const fragment = SQLFragmentHelpers.inArray('status', ['active', 'pending']);

        expect(fragment.sql).toBe('?? IN (?, ?)');
        expect(fragment.getKnexBindings()).toEqual(['status', 'active', 'pending']);
      });

      it('handles empty array', () => {
        const fragment = SQLFragmentHelpers.inArray('status', []);

        expect(fragment.sql).toBe('1 = 0'); // Always false
        expect(fragment.getKnexBindings()).toEqual([]);
      });
    });

    describe(SQLFragmentHelpers.notInArray, () => {
      it('generates NOT IN clause with values', () => {
        const fragment = SQLFragmentHelpers.notInArray('status', ['deleted', 'archived']);

        expect(fragment.sql).toBe('?? NOT IN (?, ?)');
        expect(fragment.getKnexBindings()).toEqual(['status', 'deleted', 'archived']);
      });

      it('handles empty array', () => {
        const fragment = SQLFragmentHelpers.notInArray('status', []);

        expect(fragment.sql).toBe('1 = 1'); // Always true
        expect(fragment.getKnexBindings()).toEqual([]);
      });
    });

    describe(SQLFragmentHelpers.between, () => {
      it('generates BETWEEN clause with numbers', () => {
        const fragment = SQLFragmentHelpers.between('age', 18, 65);

        expect(fragment.sql).toBe('?? BETWEEN ? AND ?');
        expect(fragment.getKnexBindings()).toEqual(['age', 18, 65]);
      });

      it('generates BETWEEN clause with dates', () => {
        const date1 = new Date('2024-01-01');
        const date2 = new Date('2024-12-31');
        const fragment = SQLFragmentHelpers.between('created_at', date1, date2);

        expect(fragment.sql).toBe('?? BETWEEN ? AND ?');
        expect(fragment.getKnexBindings()).toEqual(['created_at', date1, date2]);
      });

      it('generates BETWEEN clause with strings', () => {
        const fragment = SQLFragmentHelpers.between('name', 'A', 'Z');

        expect(fragment.sql).toBe('?? BETWEEN ? AND ?');
        expect(fragment.getKnexBindings()).toEqual(['name', 'A', 'Z']);
      });
    });

    describe(SQLFragmentHelpers.notBetween, () => {
      it('generates NOT BETWEEN clause with numbers', () => {
        const fragment = SQLFragmentHelpers.notBetween('age', 18, 65);

        expect(fragment.sql).toBe('?? NOT BETWEEN ? AND ?');
        expect(fragment.getKnexBindings()).toEqual(['age', 18, 65]);
      });

      it('generates NOT BETWEEN clause with dates', () => {
        const date1 = new Date('2024-01-01');
        const date2 = new Date('2024-12-31');
        const fragment = SQLFragmentHelpers.notBetween('created_at', date1, date2);

        expect(fragment.sql).toBe('?? NOT BETWEEN ? AND ?');
        expect(fragment.getKnexBindings()).toEqual(['created_at', date1, date2]);
      });
    });

    describe(SQLFragmentHelpers.like, () => {
      it('generates LIKE clause', () => {
        const fragment = SQLFragmentHelpers.like('name', '%John%');

        expect(fragment.sql).toBe('?? LIKE ?');
        expect(fragment.getKnexBindings()).toEqual(['name', '%John%']);
      });
    });

    describe(SQLFragmentHelpers.notLike, () => {
      it('generates NOT LIKE clause', () => {
        const fragment = SQLFragmentHelpers.notLike('name', '%test%');

        expect(fragment.sql).toBe('?? NOT LIKE ?');
        expect(fragment.getKnexBindings()).toEqual(['name', '%test%']);
      });
    });

    describe(SQLFragmentHelpers.ilike, () => {
      it('generates ILIKE clause for case-insensitive matching', () => {
        const fragment = SQLFragmentHelpers.ilike('email', '%@example.com');

        expect(fragment.sql).toBe('?? ILIKE ?');
        expect(fragment.getKnexBindings()).toEqual(['email', '%@example.com']);
      });
    });

    describe(SQLFragmentHelpers.notIlike, () => {
      it('generates NOT ILIKE clause for case-insensitive non-matching', () => {
        const fragment = SQLFragmentHelpers.notIlike('email', '%@spam.com');

        expect(fragment.sql).toBe('?? NOT ILIKE ?');
        expect(fragment.getKnexBindings()).toEqual(['email', '%@spam.com']);
      });
    });

    describe(SQLFragmentHelpers.isNull, () => {
      it('generates IS NULL', () => {
        const fragment = SQLFragmentHelpers.isNull('deleted_at');

        expect(fragment.sql).toBe('?? IS NULL');
        expect(fragment.getKnexBindings()).toEqual(['deleted_at']);
      });
    });

    describe(SQLFragmentHelpers.isNotNull, () => {
      it('generates IS NOT NULL', () => {
        const fragment = SQLFragmentHelpers.isNotNull('email');

        expect(fragment.sql).toBe('?? IS NOT NULL');
        expect(fragment.getKnexBindings()).toEqual(['email']);
      });
    });

    describe(SQLFragmentHelpers.eq, () => {
      it('generates equality check', () => {
        const fragment = SQLFragmentHelpers.eq('status', 'active');

        expect(fragment.sql).toBe('?? = ?');
        expect(fragment.getKnexBindings()).toEqual(['status', 'active']);
      });

      it('handles null in equality check', () => {
        const fragment = SQLFragmentHelpers.eq('field', null);

        expect(fragment.sql).toBe('?? IS NULL');
        expect(fragment.getKnexBindings()).toEqual(['field']);
      });

      it('handles undefined in equality check', () => {
        const fragment = SQLFragmentHelpers.eq('field', undefined);

        expect(fragment.sql).toBe('?? IS NULL');
        expect(fragment.getKnexBindings()).toEqual(['field']);
      });
    });

    describe(SQLFragmentHelpers.neq, () => {
      it('generates inequality check', () => {
        const fragment = SQLFragmentHelpers.neq('status', 'deleted');

        expect(fragment.sql).toBe('?? != ?');
        expect(fragment.getKnexBindings()).toEqual(['status', 'deleted']);
      });

      it('handles null in inequality check', () => {
        const fragment = SQLFragmentHelpers.neq('field', null);

        expect(fragment.sql).toBe('?? IS NOT NULL');
        expect(fragment.getKnexBindings()).toEqual(['field']);
      });

      it('handles undefined in inequality check', () => {
        const fragment = SQLFragmentHelpers.neq('field', undefined);

        expect(fragment.sql).toBe('?? IS NOT NULL');
        expect(fragment.getKnexBindings()).toEqual(['field']);
      });
    });

    describe(SQLFragmentHelpers.gt, () => {
      it('generates greater than', () => {
        const fragment = SQLFragmentHelpers.gt('age', 18);

        expect(fragment.sql).toBe('?? > ?');
        expect(fragment.getKnexBindings()).toEqual(['age', 18]);
      });
    });

    describe(SQLFragmentHelpers.gte, () => {
      it('generates greater than or equal', () => {
        const fragment = SQLFragmentHelpers.gte('age', 18);

        expect(fragment.sql).toBe('?? >= ?');
        expect(fragment.getKnexBindings()).toEqual(['age', 18]);
      });
    });

    describe(SQLFragmentHelpers.lt, () => {
      it('generates less than', () => {
        const fragment = SQLFragmentHelpers.lt('age', 65);

        expect(fragment.sql).toBe('?? < ?');
        expect(fragment.getKnexBindings()).toEqual(['age', 65]);
      });
    });

    describe(SQLFragmentHelpers.lte, () => {
      it('generates less than or equal', () => {
        const fragment = SQLFragmentHelpers.lte('age', 65);

        expect(fragment.sql).toBe('?? <= ?');
        expect(fragment.getKnexBindings()).toEqual(['age', 65]);
      });
    });

    describe(SQLFragmentHelpers.jsonContains, () => {
      it('generates JSON contains', () => {
        const fragment = SQLFragmentHelpers.jsonContains('metadata', { premium: true });

        expect(fragment.sql).toBe('?? @> ?::jsonb');
        expect(fragment.getKnexBindings()).toEqual(['metadata', '{"premium":true}']);
      });
    });

    describe(SQLFragmentHelpers.jsonContainedBy, () => {
      it('generates JSON contained by', () => {
        const fragment = SQLFragmentHelpers.jsonContainedBy('settings', {
          theme: 'dark',
          lang: 'en',
        });

        expect(fragment.sql).toBe('?? <@ ?::jsonb');
        expect(fragment.getKnexBindings()).toEqual(['settings', '{"theme":"dark","lang":"en"}']);
      });
    });

    describe(SQLFragmentHelpers.jsonPath, () => {
      it('generates JSON path access', () => {
        const fragment = SQLFragmentHelpers.jsonPath('data', 'user');

        expect(fragment.sql).toBe(`"data"->'user'`);
        expect(fragment.getKnexBindings()).toEqual([]);
      });
    });

    describe(SQLFragmentHelpers.jsonPathText, () => {
      it('generates JSON path text access', () => {
        const fragment = SQLFragmentHelpers.jsonPathText('data', 'email');

        expect(fragment.sql).toBe(`"data"->>'email'`);
        expect(fragment.getKnexBindings()).toEqual([]);
      });
    });

    describe(SQLFragmentHelpers.and, () => {
      it('combines conditions with AND', () => {
        const cond1 = sql`age >= ${18}`;
        const cond2 = sql`status = ${'active'}`;
        const fragment = SQLFragmentHelpers.and(cond1, cond2);

        expect(fragment.sql).toBe('age >= ? AND status = ?');
        expect(fragment.getKnexBindings()).toEqual([18, 'active']);
      });

      it('handles single condition in AND', () => {
        const cond = sql`age >= ${18}`;
        const fragment = SQLFragmentHelpers.and(cond);

        expect(fragment.sql).toBe('age >= ?');
        expect(fragment.getKnexBindings()).toEqual([18]);
      });

      it('handles empty conditions in AND', () => {
        const fragment = SQLFragmentHelpers.and();

        expect(fragment.sql).toBe('1 = 1');
        expect(fragment.getKnexBindings()).toEqual([]);
      });
    });

    describe(SQLFragmentHelpers.or, () => {
      it('combines conditions with OR', () => {
        const cond1 = sql`status = ${'active'}`;
        const cond2 = sql`status = ${'pending'}`;
        const fragment = SQLFragmentHelpers.or(cond1, cond2);

        expect(fragment.sql).toBe('status = ? OR status = ?');
        expect(fragment.getKnexBindings()).toEqual(['active', 'pending']);
      });

      it('handles single condition in OR', () => {
        const cond = sql`status = ${'active'}`;
        const fragment = SQLFragmentHelpers.or(cond);

        expect(fragment.sql).toBe('status = ?');
        expect(fragment.getKnexBindings()).toEqual(['active']);
      });

      it('handles empty conditions in OR', () => {
        const fragment = SQLFragmentHelpers.or();

        expect(fragment.sql).toBe('1 = 0');
        expect(fragment.getKnexBindings()).toEqual([]);
      });
    });

    describe(SQLFragmentHelpers.not, () => {
      it('negates conditions with NOT', () => {
        const cond = sql`status = ${'deleted'}`;
        const fragment = SQLFragmentHelpers.not(cond);

        expect(fragment.sql).toBe('NOT (status = ?)');
        expect(fragment.getKnexBindings()).toEqual(['deleted']);
      });
    });

    describe(SQLFragmentHelpers.group, () => {
      it('groups conditions with parentheses', () => {
        const cond = sql`age >= ${18} AND age <= ${65}`;
        const fragment = SQLFragmentHelpers.group(cond);

        expect(fragment.sql).toBe('(age >= ? AND age <= ?)');
        expect(fragment.getKnexBindings()).toEqual([18, 65]);
      });
    });

    describe('complex combinations', () => {
      it('builds complex queries with multiple helpers', () => {
        const { and, or, between, inArray, isNotNull, group } = SQLFragmentHelpers;

        const fragment = and(
          between('age', 18, 65),
          group(or(inArray('status', ['active', 'premium']), sql`role = ${'admin'}`)),
          isNotNull('email'),
        );

        expect(fragment.sql).toBe(
          '?? BETWEEN ? AND ? AND (?? IN (?, ?) OR role = ?) AND ?? IS NOT NULL',
        );
        expect(fragment.getKnexBindings()).toEqual([
          'age',
          18,
          65,
          'status',
          'active',
          'premium',
          'admin',
          'email',
        ]);
      });
    });
  });
});

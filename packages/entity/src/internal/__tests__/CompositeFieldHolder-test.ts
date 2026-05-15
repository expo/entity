import { describe, expect, it } from '@jest/globals';

import { EntityConfiguration } from '../../EntityConfiguration.ts';
import { StringField, UUIDField } from '../../EntityFields.ts';
import { CompositeFieldHolder, CompositeFieldValueHolder } from '../CompositeFieldHolder.ts';

type TestFields = {
  id: string;
  field1: string;
  field2: string;
};

describe(CompositeFieldHolder, () => {
  it('is order-agnostic for serialization', () => {
    const compositeFieldHolder = new CompositeFieldHolder<TestFields, 'id'>(['field1', 'field2']);
    const compositeFieldHolder2 = new CompositeFieldHolder<TestFields, 'id'>(['field2', 'field1']);

    expect(compositeFieldHolder.serialize()).toEqual(compositeFieldHolder2.serialize());
  });

  describe('createCacheKeyPartsForLoadValue', () => {
    it('omits the inherent-filters component when the entity has none', () => {
      const config = new EntityConfiguration<TestFields, 'id'>({
        idField: 'id',
        tableName: 'cache_key_parts_test',
        schema: {
          id: new UUIDField({ columnName: 'id', cache: true }),
          field1: new StringField({ columnName: 'field1' }),
          field2: new StringField({ columnName: 'field2' }),
        },
        databaseAdapterFlavor: 'postgres',
        cacheAdapterFlavor: 'redis',
      });
      const holder = new CompositeFieldHolder<TestFields, 'id'>(['field1', 'field2']);
      const parts = holder.createCacheKeyPartsForLoadValue(
        config,
        new CompositeFieldValueHolder({ id: 'unused', field1: 'a', field2: 'b' }),
      );
      expect(parts).toEqual(['field1', 'field2', 'a', 'b']);
    });

    it('appends the inherent-filters component when the entity declares filters', () => {
      const config = new EntityConfiguration<TestFields, 'id'>({
        idField: 'id',
        tableName: 'cache_key_parts_test',
        schema: {
          id: new UUIDField({ columnName: 'id', cache: true }),
          field1: new StringField({ columnName: 'field1' }),
          field2: new StringField({ columnName: 'field2' }),
        },
        databaseAdapterFlavor: 'postgres',
        cacheAdapterFlavor: 'redis',
        inherentFilters: [{ fieldName: 'field1', fieldValue: 'in-scope' }],
      });
      const holder = new CompositeFieldHolder<TestFields, 'id'>(['field1', 'field2']);
      const parts = holder.createCacheKeyPartsForLoadValue(
        config,
        new CompositeFieldValueHolder({ id: 'unused', field1: 'in-scope', field2: 'b' }),
      );
      expect(parts).toHaveLength(5);
      expect(parts.slice(0, 4)).toEqual(['field1', 'field2', 'in-scope', 'b']);
      expect(parts[4]).toEqual(config.inherentFiltersCacheKeyComponent);
    });
  });
});

describe(CompositeFieldValueHolder, () => {
  it('is order-agnostic for serialization', () => {
    const compositeFieldValueHolder = new CompositeFieldValueHolder({
      field1: 'value1',
      field2: 'value2',
    });
    const compositeFieldValueHolder2 = new CompositeFieldValueHolder({
      field2: 'value2',
      field1: 'value1',
    });

    expect(compositeFieldValueHolder.serialize()).toEqual(compositeFieldValueHolder2.serialize());
  });
});

import { describe, expect, it, test } from '@jest/globals';

import { EntityConfiguration } from '../EntityConfiguration';
import { StringField, UUIDField } from '../EntityFields';
import { CompositeFieldHolder } from '../internal/CompositeFieldHolder';

describe(EntityConfiguration, () => {
  describe('when valid', () => {
    type BlahT = {
      id: string;
      cacheable: string;
      uniqueButNotCacheable: string;
    };

    type Blah2T = {
      id: string;
    };

    const blahEntityConfiguration = new EntityConfiguration<BlahT, 'id'>({
      idField: 'id',
      tableName: 'blah_table',
      schema: {
        id: new UUIDField({
          columnName: 'id',
          cache: false,
        }),
        cacheable: new StringField({
          columnName: 'cacheable',
          cache: true,
        }),
        uniqueButNotCacheable: new StringField({
          columnName: 'unique_but_not_cacheable',
        }),
      },
      databaseAdapterFlavor: 'postgres',
      cacheAdapterFlavor: 'redis',
      compositeFieldDefinitions: [
        { compositeField: ['id', 'cacheable'], cache: true },
        { compositeField: ['id', 'uniqueButNotCacheable'], cache: false },
      ],
    });

    it('returns correct fields', () => {
      expect(blahEntityConfiguration.idField).toEqual('id');
      expect(blahEntityConfiguration.tableName).toEqual('blah_table');
      expect(blahEntityConfiguration.databaseAdapterFlavor).toEqual('postgres');
      expect(blahEntityConfiguration.cacheAdapterFlavor).toEqual('redis');
      expect(blahEntityConfiguration.compositeFieldInfo.getAllCompositeFieldHolders()).toEqual([
        new CompositeFieldHolder<BlahT, 'id'>(['id', 'cacheable']),
        new CompositeFieldHolder<BlahT, 'id'>(['id', 'uniqueButNotCacheable']),
      ]);
    });

    it('filters cacheable fields', () => {
      expect(blahEntityConfiguration.cacheableKeys).toEqual(new Set(['cacheable']));
    });

    it('correctly returns cacheable composite fields', () => {
      expect(
        blahEntityConfiguration.compositeFieldInfo.canCacheCompositeField(['id', 'cacheable']),
      ).toBe(true);
      expect(
        blahEntityConfiguration.compositeFieldInfo.canCacheCompositeField([
          'id',
          'uniqueButNotCacheable',
        ]),
      ).toBe(false);

      expect(() =>
        blahEntityConfiguration.compositeFieldInfo.canCacheCompositeField(['id']),
      ).toThrow('Composite field (id) not found in entity configuration');
    });

    it('validates composite fields', () => {
      expect(
        () =>
          new EntityConfiguration<BlahT, 'id'>({
            idField: 'id',
            tableName: 'blah_table',
            schema: {
              id: new UUIDField({
                columnName: 'id',
                cache: false,
              }),
              cacheable: new StringField({
                columnName: 'cacheable',
                cache: true,
              }),
              uniqueButNotCacheable: new StringField({
                columnName: 'unique_but_not_cacheable',
              }),
            },
            databaseAdapterFlavor: 'postgres',
            cacheAdapterFlavor: 'redis',
            compositeFieldDefinitions: [{ compositeField: ['id', 'id'], cache: true }],
          }),
      ).toThrow('Composite field must have unique sub-fields');

      expect(
        () =>
          new EntityConfiguration<BlahT, 'id'>({
            idField: 'id',
            tableName: 'blah_table',
            schema: {
              id: new UUIDField({
                columnName: 'id',
                cache: false,
              }),
              cacheable: new StringField({
                columnName: 'cacheable',
                cache: true,
              }),
              uniqueButNotCacheable: new StringField({
                columnName: 'unique_but_not_cacheable',
              }),
            },
            databaseAdapterFlavor: 'postgres',
            cacheAdapterFlavor: 'redis',
            compositeFieldDefinitions: [{ compositeField: ['id'], cache: true }],
          }),
      ).toThrow('Composite field must have at least two sub-fields');
    });

    describe('cache key version', () => {
      it('defaults to 0', () => {
        const entityConfiguration = new EntityConfiguration<Blah2T, 'id'>({
          idField: 'id',
          tableName: 'blah',
          schema: {
            id: new UUIDField({
              columnName: 'id',
              cache: false,
            }),
          },
          databaseAdapterFlavor: 'postgres',
          cacheAdapterFlavor: 'redis',
        });
        expect(entityConfiguration.cacheKeyVersion).toEqual(0);
      });

      it('sets to custom version', () => {
        const entityConfiguration = new EntityConfiguration<Blah2T, 'id'>({
          idField: 'id',
          tableName: 'blah',
          schema: {
            id: new UUIDField({
              columnName: 'id',
              cache: false,
            }),
          },
          databaseAdapterFlavor: 'postgres',
          cacheAdapterFlavor: 'redis',
          cacheKeyVersion: 100,
        });
        expect(entityConfiguration.cacheKeyVersion).toEqual(100);
      });
    });
  });

  describe('validation', () => {
    describe('disallows keys of JS Object prototype for safety', () => {
      test.each([
        'constructor',
        '__defineGetter__',
        '__defineSetter__',
        'hasOwnProperty',
        '__lookupGetter__',
        '__lookupSetter__',
        'isPrototypeOf',
        'propertyIsEnumerable',
        'toString',
        'valueOf',
        '__proto__',
        'toLocaleString',
      ])('disallows %p as field key', (keyName) => {
        expect(
          () =>
            new EntityConfiguration<{ id: string }, 'id'>({
              idField: 'id',
              tableName: 'blah_table',
              schema: {
                id: new UUIDField({
                  columnName: 'id',
                  cache: false,
                }),
                [keyName]: new StringField({
                  columnName: 'any',
                }),
              },
              databaseAdapterFlavor: 'postgres',
              cacheAdapterFlavor: 'redis',
            }),
        ).toThrow(
          `Entity field name not allowed to prevent conflicts with standard Object prototype fields: ${keyName}`,
        );
      });
    });
  });
});

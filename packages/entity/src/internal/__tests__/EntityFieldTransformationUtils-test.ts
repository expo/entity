import EntityConfiguration from '../../EntityConfiguration';
import { StringField, UUIDField } from '../../EntityFields';
import {
  getDatabaseFieldForEntityField,
  transformDatabaseObjectToFields,
  transformFieldsToDatabaseObject,
  transformCacheObjectToFields,
  transformFieldsToCacheObject,
} from '../EntityFieldTransformationUtils';

type BlahT = {
  id: string;
  cacheable: string;
  uniqueButNotCacheable: string;
  transformRead: string;
  transformWrite: string;
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
    transformRead: new StringField({
      columnName: 'transform_read',
    }),
    transformWrite: new StringField({
      columnName: 'transform_write',
    }),
  },
  databaseAdapterFlavor: 'postgres',
  cacheAdapterFlavor: 'redis',
});

describe(getDatabaseFieldForEntityField, () => {
  it('returns correct mapping', () => {
    expect(getDatabaseFieldForEntityField(blahEntityConfiguration, 'cacheable')).toEqual(
      'cacheable',
    );
    expect(
      getDatabaseFieldForEntityField(blahEntityConfiguration, 'uniqueButNotCacheable'),
    ).toEqual('unique_but_not_cacheable');
  });
});

describe(transformDatabaseObjectToFields, () => {
  it('leaves out unknown fields', () => {
    expect(
      transformDatabaseObjectToFields(blahEntityConfiguration, new Map(), {
        id: 'blah',
        unique_but_not_cacheable: 'wat',
        who: 'why',
      }),
    ).toEqual({
      id: 'blah',
      uniqueButNotCacheable: 'wat',
    });
  });

  it('does field read transformation', () => {
    const fieldTransformMap = new Map([
      [
        StringField.name,
        {
          read: (val: any) => `${val}-read-transformed`,
        },
      ],
    ]);

    expect(
      transformDatabaseObjectToFields(blahEntityConfiguration, fieldTransformMap, {
        transform_read: 'wat',
      }),
    ).toEqual({
      transformRead: 'wat-read-transformed',
    });
  });
});

describe(transformFieldsToDatabaseObject, () => {
  it('transforms fields', () => {
    expect(
      transformFieldsToDatabaseObject(blahEntityConfiguration, new Map(), {
        id: 'blah',
        cacheable: 'wat',
        uniqueButNotCacheable: 'wat',
      }),
    ).toEqual({
      id: 'blah',
      cacheable: 'wat',
      unique_but_not_cacheable: 'wat',
    });
  });

  it('does field write transformation', () => {
    const fieldTransformMap = new Map([
      [
        StringField.name,
        {
          write: (val: string) => `${val}-write-transformed`,
        },
      ],
    ]);

    expect(
      transformFieldsToDatabaseObject(blahEntityConfiguration, fieldTransformMap, {
        transformWrite: 'wat',
      }),
    ).toEqual({
      transform_write: 'wat-write-transformed',
    });
  });
});

describe(transformCacheObjectToFields, () => {
  it('does field read transformation, keeping unknown fields for cache version inconsistencies', () => {
    const fieldTransformMap = new Map([
      [
        StringField.name,
        {
          read: (val: any) => `${val}-read-transformed-cache`,
        },
      ],
    ]);

    expect(
      transformCacheObjectToFields(blahEntityConfiguration, fieldTransformMap, {
        id: 'hello',
        transformRead: 'wat',
        unknownField: 'who',
      }),
    ).toEqual({
      id: 'hello',
      transformRead: 'wat-read-transformed-cache',
      unknownField: 'who',
    });
  });
});

describe(transformFieldsToCacheObject, () => {
  it('does field write transformation, keeping unknown fields at runtime for cache version inconsistencies', () => {
    const fieldTransformMap = new Map([
      [
        StringField.name,
        {
          write: (val: string) => `${val}-write-transformed-cache`,
        },
      ],
    ]);

    expect(
      transformFieldsToCacheObject(blahEntityConfiguration, fieldTransformMap, {
        id: 'hello',
        transformWrite: 'wat',
        unknownField: 'who',
      } as any),
    ).toEqual({
      id: 'hello',
      transformWrite: 'wat-write-transformed-cache',
      unknownField: 'who',
    });
  });
});

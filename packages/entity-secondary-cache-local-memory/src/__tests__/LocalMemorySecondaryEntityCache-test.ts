import {
  AlwaysAllowPrivacyPolicyRule,
  AuthorizationResultBasedEntityLoader,
  Entity,
  EntityCompanionDefinition,
  EntityCompanionProvider,
  EntityConfiguration,
  EntityConstructionUtils,
  EntityPrivacyPolicy,
  EntitySecondaryCacheLoader,
  IEntityMetricsAdapter,
  mapMapAsync,
  NoOpEntityMetricsAdapter,
  StringField,
  UUIDField,
  ViewerContext,
} from '@expo/entity';
import {
  ILocalMemoryCache,
  LocalMemoryCacheAdapterProvider,
  LocalMemoryCacheValue,
} from '@expo/entity-cache-adapter-local-memory';
import { StubDatabaseAdapterProvider, StubQueryContextProvider } from '@expo/entity-testing-utils';
import { TTLCache } from '@isaacs/ttlcache';
import { describe, expect, it } from '@jest/globals';
import nullthrows from 'nullthrows';

import { LocalMemorySecondaryEntityCache } from '../LocalMemorySecondaryEntityCache';

export type LocalMemoryTestEntityFields = {
  id: string;
  name: string;
};

export default class LocalMemoryTestEntity extends Entity<
  LocalMemoryTestEntityFields,
  'id',
  ViewerContext
> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    LocalMemoryTestEntityFields,
    'id',
    ViewerContext,
    LocalMemoryTestEntity,
    LocalMemoryTestEntityPrivacyPolicy
  > {
    return {
      entityClass: LocalMemoryTestEntity,
      entityConfiguration: localMemoryTestEntityConfiguration,
      privacyPolicyClass: LocalMemoryTestEntityPrivacyPolicy,
    };
  }
}

export class LocalMemoryTestEntityPrivacyPolicy extends EntityPrivacyPolicy<
  LocalMemoryTestEntityFields,
  'id',
  ViewerContext,
  LocalMemoryTestEntity
> {
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<
      LocalMemoryTestEntityFields,
      'id',
      ViewerContext,
      LocalMemoryTestEntity
    >(),
  ];
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<
      LocalMemoryTestEntityFields,
      'id',
      ViewerContext,
      LocalMemoryTestEntity
    >(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<
      LocalMemoryTestEntityFields,
      'id',
      ViewerContext,
      LocalMemoryTestEntity
    >(),
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<
      LocalMemoryTestEntityFields,
      'id',
      ViewerContext,
      LocalMemoryTestEntity
    >(),
  ];
}

export const localMemoryTestEntityConfiguration = new EntityConfiguration<
  LocalMemoryTestEntityFields,
  'id'
>({
  idField: 'id',
  tableName: 'local_memory_test_entities',
  schema: {
    id: new UUIDField({
      columnName: 'id',
      cache: false,
    }),
    name: new StringField({
      columnName: 'name',
    }),
  },
  databaseAdapterFlavor: 'postgres',
  cacheAdapterFlavor: 'local-memory',
});

const queryContextProvider = new StubQueryContextProvider();

function createTTLCache<TFields extends Record<string, any>>(): ILocalMemoryCache<TFields> {
  return new TTLCache<string, LocalMemoryCacheValue<TFields>>({
    max: 10000,
    ttl: 10 * 1000, // convert to ms
    updateAgeOnGet: true,
  });
}

export const createTestEntityCompanionProvider = (
  metricsAdapter: IEntityMetricsAdapter = new NoOpEntityMetricsAdapter(),
): EntityCompanionProvider => {
  return new EntityCompanionProvider(
    metricsAdapter,
    new Map([
      [
        'postgres',
        {
          adapterProvider: new StubDatabaseAdapterProvider(),
          queryContextProvider,
        },
      ],
    ]),
    new Map([
      [
        'local-memory',
        {
          cacheAdapterProvider:
            LocalMemoryCacheAdapterProvider.createProviderWithCacheCreator(createTTLCache),
        },
      ],
    ]),
  );
};

class TestViewerContext extends ViewerContext {}

type TestLoadParams = { id: string };

const FAKE_ID = 'fake';

class TestSecondaryLocalMemoryCacheLoader extends EntitySecondaryCacheLoader<
  TestLoadParams,
  LocalMemoryTestEntityFields,
  'id',
  TestViewerContext,
  LocalMemoryTestEntity,
  LocalMemoryTestEntityPrivacyPolicy
> {
  public databaseLoadCount = 0;

  constructor(
    secondaryEntityCache: LocalMemorySecondaryEntityCache<
      LocalMemoryTestEntityFields,
      'id',
      TestLoadParams
    >,
    constructionUtils: EntityConstructionUtils<
      LocalMemoryTestEntityFields,
      'id',
      TestViewerContext,
      LocalMemoryTestEntity,
      LocalMemoryTestEntityPrivacyPolicy,
      keyof LocalMemoryTestEntityFields
    >,
    private readonly entityLoader: AuthorizationResultBasedEntityLoader<
      LocalMemoryTestEntityFields,
      'id',
      TestViewerContext,
      LocalMemoryTestEntity,
      LocalMemoryTestEntityPrivacyPolicy,
      keyof LocalMemoryTestEntityFields
    >,
  ) {
    super(secondaryEntityCache, constructionUtils);
  }

  protected async fetchObjectsFromDatabaseAsync(
    loadParamsArray: readonly Readonly<TestLoadParams>[],
  ): Promise<ReadonlyMap<Readonly<TestLoadParams>, Readonly<LocalMemoryTestEntityFields> | null>> {
    this.databaseLoadCount += loadParamsArray.length;

    const emptyMap = new Map(loadParamsArray.map((p) => [p, null]));
    return await mapMapAsync(emptyMap, async (_value, loadParams) => {
      if (loadParams.id === FAKE_ID) {
        return null;
      }
      return nullthrows(
        (await this.entityLoader.loadManyByFieldEqualingAsync('id', loadParams.id))[0],
      )
        .enforceValue()
        .getAllFields();
    });
  }
}

describe(LocalMemorySecondaryEntityCache, () => {
  it('Loads through secondary loader, caches, and invalidates', async () => {
    const viewerContext = new TestViewerContext(createTestEntityCompanionProvider());

    const createdEntity = await LocalMemoryTestEntity.creator(viewerContext)
      .setField('name', 'wat')
      .createAsync();

    const secondaryCacheLoader = new TestSecondaryLocalMemoryCacheLoader(
      new LocalMemorySecondaryEntityCache(
        localMemoryTestEntityConfiguration,
        createTTLCache<LocalMemoryTestEntityFields>(),
      ),
      EntitySecondaryCacheLoader.getConstructionUtilsForEntityClass(
        LocalMemoryTestEntity,
        viewerContext,
      ),
      LocalMemoryTestEntity.loaderWithAuthorizationResults(viewerContext),
    );

    const loadParams = { id: createdEntity.getID() };
    const results = await secondaryCacheLoader.loadManyAsync([loadParams]);
    expect(nullthrows(results.get(loadParams)).enforceValue().getID()).toEqual(
      createdEntity.getID(),
    );

    expect(secondaryCacheLoader.databaseLoadCount).toEqual(1);

    const results2 = await secondaryCacheLoader.loadManyAsync([loadParams]);
    expect(nullthrows(results2.get(loadParams)).enforceValue().getID()).toEqual(
      createdEntity.getID(),
    );

    expect(secondaryCacheLoader.databaseLoadCount).toEqual(1);

    await secondaryCacheLoader.invalidateManyAsync([loadParams]);

    const results3 = await secondaryCacheLoader.loadManyAsync([loadParams]);
    expect(nullthrows(results3.get(loadParams)).enforceValue().getID()).toEqual(
      createdEntity.getID(),
    );

    expect(secondaryCacheLoader.databaseLoadCount).toEqual(2);
  });

  it('correctly handles uncached and unfetchable load params', async () => {
    const viewerContext = new TestViewerContext(createTestEntityCompanionProvider());

    const secondaryCacheLoader = new TestSecondaryLocalMemoryCacheLoader(
      new LocalMemorySecondaryEntityCache(
        localMemoryTestEntityConfiguration,
        createTTLCache<LocalMemoryTestEntityFields>(),
      ),
      EntitySecondaryCacheLoader.getConstructionUtilsForEntityClass(
        LocalMemoryTestEntity,
        viewerContext,
      ),
      LocalMemoryTestEntity.loaderWithAuthorizationResults(viewerContext),
    );

    const loadParams = { id: FAKE_ID };
    const results = await secondaryCacheLoader.loadManyAsync([loadParams]);
    expect(results.size).toBe(1);
    expect(results.get(loadParams)).toBe(null);
  });
});

import Entity from '../../Entity';
import {
  EntityCompanionDefinition,
  DatabaseAdapterFlavor,
  CacheAdapterFlavor,
} from '../../EntityCompanionProvider';
import EntityConfiguration from '../../EntityConfiguration';
import { EntityNotFoundError } from '../../EntityErrors';
import { UUIDField, EnumField, StringField } from '../../EntityFields';
import EntityPrivacyPolicy from '../../EntityPrivacyPolicy';
import ViewerContext from '../../ViewerContext';
import AlwaysAllowPrivacyPolicyRule from '../../rules/AlwaysAllowPrivacyPolicyRule';
import { InMemoryFullCacheStubCacheAdapter } from '../../utils/testing/StubCacheAdapter';
import { createUnitTestEntityCompanionProvider } from '../../utils/testing/createUnitTestEntityCompanionProvider';

describe('Two entities backed by the same table', () => {
  test('load by different types', async () => {
    const companionProvider = createUnitTestEntityCompanionProvider();
    const viewerContext = new ViewerContext(companionProvider);

    const one = await OneTestEntity.creator(viewerContext)
      .setField('entity_type', EntityType.ONE)
      .enforceCreateAsync();

    const two = await TwoTestEntity.creator(viewerContext)
      .setField('entity_type', EntityType.TWO)
      .setField('other_field', 'blah')
      .enforceCreateAsync();

    expect(one).toBeInstanceOf(OneTestEntity);
    expect(two).toBeInstanceOf(TwoTestEntity);

    await expect(
      TwoTestEntity.loader(viewerContext).enforcing().loadByIDAsync(one.getID())
    ).rejects.toThrowError(EntityNotFoundError);
    await expect(
      OneTestEntity.loader(viewerContext).enforcing().loadByIDAsync(two.getID())
    ).rejects.toThrowError(EntityNotFoundError);
  });

  test('not cached if error is thrown during instantiation', async () => {
    const companionProvider = createUnitTestEntityCompanionProvider();
    const viewerContext = new ViewerContext(companionProvider);

    const one = await OneTestEntity.creator(viewerContext)
      .setField('id', 'one')
      .setField('entity_type', EntityType.ONE)
      .enforceCreateAsync();

    const two = await TwoTestEntity.creator(viewerContext)
      .setField('id', 'two')
      .setField('entity_type', EntityType.TWO)
      .setField('other_field', 'blah')
      .enforceCreateAsync();

    try {
      await OneTestEntity.loader(viewerContext).enforcing().loadByIDAsync(two.getID());
    } catch (e) {}

    const twoLoaded = await TwoTestEntity.loader(viewerContext)
      .enforcing()
      .loadByIDAsync(two.getID());
    expect(twoLoaded.getAllFields()).toEqual(two.getAllFields());

    try {
      await TwoTestEntity.loader(viewerContext).enforcing().loadByIDAsync(one.getID());
    } catch (e) {}

    const oneLoaded = await OneTestEntity.loader(viewerContext)
      .enforcing()
      .loadByIDAsync(one.getID());
    expect(oneLoaded.getAllFields()).toEqual(one.getAllFields());

    const companion = companionProvider.getCompanionForEntity(
      TwoTestEntity,
      twoTestEntityCompanion
    );
    const cacheAdapter = companion['cacheAdapter'] as InMemoryFullCacheStubCacheAdapter<
      TwoTestFields
    >;

    // check that only two objects were cached (invalid loads were not cached)
    expect(cacheAdapter.cache.size).toEqual(2);
  });
});

enum EntityType {
  ONE,
  TWO,
}

interface OneTestFields {
  id: string;
  entity_type: EntityType.ONE;
}

interface TwoTestFields {
  id: string;
  other_field: string;
  entity_type: EntityType.TWO;
}

const oneTestEntityConfiguration = new EntityConfiguration<OneTestFields>({
  idField: 'id',
  tableName: 'entities',
  cacheName: 'entities_1',
  schema: {
    id: new UUIDField({
      columnName: 'custom_id',
      cache: true,
    }),
    entity_type: new EnumField<EntityType>({
      columnName: 'entity_type',
      validator: {
        read: (type) => type === EntityType.ONE,
      },
    }),
  },
});

const twoTestEntityConfiguration = new EntityConfiguration<TwoTestFields>({
  idField: 'id',
  tableName: 'entities',
  cacheName: 'entities_2',
  schema: {
    id: new UUIDField({
      columnName: 'custom_id',
      cache: true,
    }),
    other_field: new StringField({
      columnName: 'other_field',
    }),
    entity_type: new EnumField<EntityType>({
      columnName: 'entity_type',
      validator: {
        read: (type) => type === EntityType.TWO,
      },
    }),
  },
});

class TestEntityPrivacyPolicy extends EntityPrivacyPolicy<any, string, ViewerContext, any> {
  protected readonly readRules = [new AlwaysAllowPrivacyPolicyRule()];
  protected readonly createRules = [new AlwaysAllowPrivacyPolicyRule()];
  protected readonly updateRules = [new AlwaysAllowPrivacyPolicyRule()];
  protected readonly deleteRules = [new AlwaysAllowPrivacyPolicyRule()];
}

class OneTestEntity extends Entity<OneTestFields, string, ViewerContext> {
  static getCompanionDefinition(): EntityCompanionDefinition<
    OneTestFields,
    string,
    ViewerContext,
    OneTestEntity,
    TestEntityPrivacyPolicy
  > {
    return oneTestEntityCompanion;
  }
}

class TwoTestEntity extends Entity<TwoTestFields, string, ViewerContext> {
  static getCompanionDefinition(): EntityCompanionDefinition<
    TwoTestFields,
    string,
    ViewerContext,
    TwoTestEntity,
    TestEntityPrivacyPolicy
  > {
    return twoTestEntityCompanion;
  }
}

const oneTestEntityCompanion = {
  entityClass: OneTestEntity,
  entityConfiguration: oneTestEntityConfiguration,
  databaseAdaptorFlavor: DatabaseAdapterFlavor.POSTGRES,
  cacheAdaptorFlavor: CacheAdapterFlavor.REDIS,
  privacyPolicyClass: TestEntityPrivacyPolicy,
};

const twoTestEntityCompanion = {
  entityClass: TwoTestEntity,
  entityConfiguration: twoTestEntityConfiguration,
  databaseAdaptorFlavor: DatabaseAdapterFlavor.POSTGRES,
  cacheAdaptorFlavor: CacheAdapterFlavor.REDIS,
  privacyPolicyClass: TestEntityPrivacyPolicy,
};

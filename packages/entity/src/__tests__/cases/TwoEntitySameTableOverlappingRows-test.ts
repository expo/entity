import Entity from '../../Entity';
import {
  EntityCompanionDefinition,
  DatabaseAdapterFlavor,
  CacheAdapterFlavor,
} from '../../EntityCompanionProvider';
import EntityConfiguration from '../../EntityConfiguration';
import { UUIDField, StringField } from '../../EntityFields';
import EntityPrivacyPolicy from '../../EntityPrivacyPolicy';
import ViewerContext from '../../ViewerContext';
import AlwaysAllowPrivacyPolicyRule from '../../rules/AlwaysAllowPrivacyPolicyRule';
import { createUnitTestEntityCompanionProvider } from '../../utils/testing/createUnitTestEntityCompanionProvider';

describe('Two entities backed by the same table', () => {
  test('mutate through different types and keep consistent cache and dataloader', async () => {
    const companionProvider = createUnitTestEntityCompanionProvider();
    const viewerContext = new ViewerContext(companionProvider);

    const entity1 = await OneTestEntity.creator(viewerContext)
      .setField('fake_field', 'hello')
      .enforceCreateAsync();
    expect(entity1).toBeInstanceOf(OneTestEntity);

    const entity2 = await TwoTestEntity.loader(viewerContext)
      .enforcing()
      .loadByIDAsync(entity1.getID());
    expect(entity2).toBeInstanceOf(TwoTestEntity);

    const updated2 = await TwoTestEntity.updater(entity2)
      .setField('fake_field', 'world')
      .setField('other_field', 'wat')
      .enforceUpdateAsync();
    expect(updated2.getAllFields()).toMatchObject({
      id: updated2.getID(),
      other_field: 'wat',
      fake_field: 'world',
    });

    const loaded1 = await OneTestEntity.loader(viewerContext)
      .enforcing()
      .loadByIDAsync(entity1.getID());
    expect(loaded1.getAllFields()).toMatchObject({
      id: updated2.getID(),
      fake_field: 'world',
    });
  });

  test('cached field that differs between the two to test invalidation', async () => {
    const companionProvider = createUnitTestEntityCompanionProvider();
    const viewerContext = new ViewerContext(companionProvider);

    const entity = await TwoTestEntity.creator(viewerContext)
      .setField('fake_field', 'hello')
      .setField('other_field', 'huh')
      .enforceCreateAsync();

    const loadedEntity = await TwoTestEntity.loader(viewerContext)
      .enforcing()
      .loadByFieldEqualingAsync('other_field', 'huh');
    expect(loadedEntity?.getAllFields()).toMatchObject({
      id: entity.getID(),
      fake_field: 'hello',
      other_field: 'huh',
    });

    const loaded1 = await OneTestEntity.loader(viewerContext)
      .enforcing()
      .loadByIDAsync(entity.getID());
    await OneTestEntity.updater(loaded1).setField('fake_field', 'world').enforceUpdateAsync();

    const loaded2 = await TwoTestEntity.loader(viewerContext)
      .enforcing()
      .loadByFieldEqualingAsync('other_field', 'huh');
    expect(loaded2?.getAllFields()).toMatchObject({
      id: entity.getID(),
      fake_field: 'world',
      other_field: 'huh',
    });

    const loaded22 = await TwoTestEntity.loader(viewerContext)
      .enforcing()
      .loadByFieldEqualingAsync('fake_field', 'world');
    expect(loaded22?.getAllFields()).toMatchObject({
      id: entity.getID(),
      fake_field: 'world',
      other_field: 'huh',
    });
  });
});

interface TestDatabaseFields {
  id: string;
  other_field: string;
  fake_field: string;
}

type OneTestFields = Pick<TestDatabaseFields, 'id' | 'fake_field'>;
type TwoTestFields = Pick<TestDatabaseFields, 'id' | 'other_field' | 'fake_field'>;

const testEntityConfiguration = new EntityConfiguration<TestDatabaseFields>({
  idField: 'id',
  tableName: 'entities',
  schema: {
    id: new UUIDField({
      columnName: 'custom_id',
      cache: true,
    }),
    other_field: new StringField({
      columnName: 'other_field',
      cache: true,
    }),
    fake_field: new StringField({
      columnName: 'fake_field',
      cache: true,
    }),
  },
  databaseAdapterFlavor: DatabaseAdapterFlavor.POSTGRES,
  cacheAdapterFlavor: CacheAdapterFlavor.REDIS,
});

class TestEntityPrivacyPolicy extends EntityPrivacyPolicy<any, string, ViewerContext, any, any> {
  protected readonly readRules = [new AlwaysAllowPrivacyPolicyRule()];
  protected readonly createRules = [new AlwaysAllowPrivacyPolicyRule()];
  protected readonly updateRules = [new AlwaysAllowPrivacyPolicyRule()];
  protected readonly deleteRules = [new AlwaysAllowPrivacyPolicyRule()];
}

class OneTestEntity extends Entity<OneTestFields, string, ViewerContext, TestDatabaseFields> {
  static getCompanionDefinition(): EntityCompanionDefinition<
    OneTestFields,
    string,
    ViewerContext,
    OneTestEntity,
    TestEntityPrivacyPolicy,
    TestDatabaseFields
  > {
    return oneTestEntityCompanion;
  }
}

class TwoTestEntity extends Entity<TwoTestFields, string, ViewerContext, TestDatabaseFields> {
  static getCompanionDefinition(): EntityCompanionDefinition<
    TwoTestFields,
    string,
    ViewerContext,
    TwoTestEntity,
    TestEntityPrivacyPolicy,
    TestDatabaseFields
  > {
    return twoTestEntityCompanion;
  }
}

const oneTestEntityCompanion = new EntityCompanionDefinition({
  entityClass: OneTestEntity,
  entityConfiguration: testEntityConfiguration,
  privacyPolicyClass: TestEntityPrivacyPolicy,
});

const twoTestEntityCompanion = new EntityCompanionDefinition({
  entityClass: TwoTestEntity,
  entityConfiguration: testEntityConfiguration,
  privacyPolicyClass: TestEntityPrivacyPolicy,
});

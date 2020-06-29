import Entity from '../../Entity';
import {
  EntityCompanionDefinition,
  DatabaseAdapterFlavor,
  CacheAdapterFlavor,
} from '../../EntityCompanionProvider';
import EntityConfiguration from '../../EntityConfiguration';
import { UUIDField, EnumField, StringField } from '../../EntityFields';
import EntityPrivacyPolicy from '../../EntityPrivacyPolicy';
import ViewerContext from '../../ViewerContext';
import AlwaysAllowPrivacyPolicyRule from '../../rules/AlwaysAllowPrivacyPolicyRule';
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
    ).rejects.toThrowError('TwoTestEntity must be instantiated with two data');
    await expect(
      OneTestEntity.loader(viewerContext).enforcing().loadByIDAsync(two.getID())
    ).rejects.toThrowError('OneTestEntity must be instantiated with one data');
  });
});

enum EntityType {
  ONE,
  TWO,
}

interface TestDatabaseFields {
  id: string;
  other_field: string;
  entity_type: EntityType;
}

type OneTestFields = Pick<TestDatabaseFields, 'id' | 'entity_type'>;
type TwoTestFields = Pick<TestDatabaseFields, 'id' | 'other_field' | 'entity_type'>;

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
    }),
    entity_type: new EnumField({
      columnName: 'entity_type',
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
  constructor(viewerContext: ViewerContext, rawFields: Readonly<TestDatabaseFields>) {
    if (rawFields.entity_type !== EntityType.ONE) {
      throw new Error('OneTestEntity must be instantiated with one data');
    }
    super(viewerContext, rawFields);
  }

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
  constructor(viewerContext: ViewerContext, rawFields: Readonly<TestDatabaseFields>) {
    if (rawFields.entity_type !== EntityType.TWO) {
      throw new Error('TwoTestEntity must be instantiated with two data');
    }
    super(viewerContext, rawFields);
  }

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
  entitySelectedFields: ['id', 'entity_type'],
});

const twoTestEntityCompanion = new EntityCompanionDefinition({
  entityClass: TwoTestEntity,
  entityConfiguration: testEntityConfiguration,
  privacyPolicyClass: TestEntityPrivacyPolicy,
  entitySelectedFields: ['id', 'other_field', 'entity_type'],
});

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

interface TestFields {
  id: string;
  other_field: string;
  entity_type: EntityType;
}

type OneTestFields = 'id' | 'entity_type';
type TwoTestFields = 'id' | 'other_field' | 'entity_type';

const testEntityConfiguration = new EntityConfiguration<TestFields>({
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
});

class TestEntityPrivacyPolicy extends EntityPrivacyPolicy<any, string, ViewerContext, any, any> {
  protected readonly readRules = [new AlwaysAllowPrivacyPolicyRule()];
  protected readonly createRules = [new AlwaysAllowPrivacyPolicyRule()];
  protected readonly updateRules = [new AlwaysAllowPrivacyPolicyRule()];
  protected readonly deleteRules = [new AlwaysAllowPrivacyPolicyRule()];
}

class OneTestEntity extends Entity<TestFields, string, ViewerContext, OneTestFields> {
  constructor(viewerContext: ViewerContext, rawFields: Readonly<TestFields>) {
    if (rawFields.entity_type !== EntityType.ONE) {
      throw new Error('OneTestEntity must be instantiated with one data');
    }
    super(viewerContext, rawFields);
  }

  static getCompanionDefinition(): EntityCompanionDefinition<
    TestFields,
    string,
    ViewerContext,
    OneTestEntity,
    TestEntityPrivacyPolicy,
    OneTestFields
  > {
    return oneTestEntityCompanion;
  }
}

class TwoTestEntity extends Entity<TestFields, string, ViewerContext, TwoTestFields> {
  constructor(viewerContext: ViewerContext, rawFields: Readonly<TestFields>) {
    if (rawFields.entity_type !== EntityType.TWO) {
      throw new Error('TwoTestEntity must be instantiated with two data');
    }
    super(viewerContext, rawFields);
  }

  static getCompanionDefinition(): EntityCompanionDefinition<
    TestFields,
    string,
    ViewerContext,
    TwoTestEntity,
    TestEntityPrivacyPolicy,
    TwoTestFields
  > {
    return twoTestEntityCompanion;
  }
}

const oneTestEntityCompanion = {
  entityClass: OneTestEntity,
  entityConfiguration: testEntityConfiguration,
  databaseAdaptorFlavor: DatabaseAdapterFlavor.POSTGRES,
  cacheAdaptorFlavor: CacheAdapterFlavor.REDIS,
  privacyPolicyClass: TestEntityPrivacyPolicy,
};

const twoTestEntityCompanion = {
  entityClass: TwoTestEntity,
  entityConfiguration: testEntityConfiguration,
  databaseAdaptorFlavor: DatabaseAdapterFlavor.POSTGRES,
  cacheAdaptorFlavor: CacheAdapterFlavor.REDIS,
  privacyPolicyClass: TestEntityPrivacyPolicy,
};

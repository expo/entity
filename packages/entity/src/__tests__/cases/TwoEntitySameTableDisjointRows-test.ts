import Entity from '../../Entity';
import { EntityCompanionDefinition } from '../../EntityCompanionProvider';
import EntityConfiguration from '../../EntityConfiguration';
import { UUIDField, EnumField, StringField } from '../../EntityFields';
import EntityPrivacyPolicy from '../../EntityPrivacyPolicy';
import ViewerContext from '../../ViewerContext';
import { successfulResults, failedResults } from '../../entityUtils';
import AlwaysAllowPrivacyPolicyRule from '../../rules/AlwaysAllowPrivacyPolicyRule';
import PrivacyPolicyRule from '../../rules/PrivacyPolicyRule';
import { createUnitTestEntityCompanionProvider } from '../../utils/testing/createUnitTestEntityCompanionProvider';

describe('Two entities backed by the same table', () => {
  test('load by different types', async () => {
    const companionProvider = createUnitTestEntityCompanionProvider();
    const viewerContext = new ViewerContext(companionProvider);

    const one = await OneTestEntity.creator(viewerContext)
      .setField('entity_type', EntityType.ONE)
      .setField('common_other_field', 'wat')
      .enforceCreateAsync();

    const two = await TwoTestEntity.creator(viewerContext)
      .setField('entity_type', EntityType.TWO)
      .setField('other_field', 'blah')
      .setField('common_other_field', 'wat')
      .enforceCreateAsync();

    expect(one).toBeInstanceOf(OneTestEntity);
    expect(two).toBeInstanceOf(TwoTestEntity);

    await expect(
      TwoTestEntity.loader(viewerContext).enforcing().loadByIDAsync(one.getID())
    ).rejects.toThrowError('TwoTestEntity must be instantiated with two data');

    await expect(
      OneTestEntity.loader(viewerContext).enforcing().loadByIDAsync(two.getID())
    ).rejects.toThrowError('OneTestEntity must be instantiated with one data');

    const manyResults = await OneTestEntity.loader(viewerContext).loadManyByFieldEqualingAsync(
      'common_other_field',
      'wat'
    );
    const successfulManyResults = successfulResults(manyResults);
    const failedManyResults = failedResults(manyResults);

    expect(successfulManyResults).toHaveLength(1);
    expect(failedManyResults).toHaveLength(1);

    expect(successfulManyResults[0]!.enforceValue().getID()).toEqual(one.getID());
    expect(failedManyResults[0]!.enforceError().message).toEqual(
      'OneTestEntity must be instantiated with one data'
    );

    const fieldEqualityConjunctionResults = await OneTestEntity.loader(
      viewerContext
    ).loadManyByFieldEqualityConjunctionAsync([
      {
        fieldName: 'common_other_field',
        fieldValue: 'wat',
      },
    ]);
    const successfulfieldEqualityConjunctionResultsResults = successfulResults(
      fieldEqualityConjunctionResults
    );
    const failedfieldEqualityConjunctionResultsResults = failedResults(
      fieldEqualityConjunctionResults
    );
    expect(successfulfieldEqualityConjunctionResultsResults).toHaveLength(1);
    expect(failedfieldEqualityConjunctionResultsResults).toHaveLength(1);
  });
});

enum EntityType {
  ONE,
  TWO,
}

interface TestFields {
  id: string;
  other_field: string;
  common_other_field: string;
  entity_type: EntityType;
}

type OneTestFields = 'id' | 'entity_type' | 'common_other_field';
type TwoTestFields = 'id' | 'other_field' | 'entity_type' | 'common_other_field';

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
    common_other_field: new StringField({
      columnName: 'common_other_field',
    }),
    entity_type: new EnumField({
      columnName: 'entity_type',
    }),
  },
  databaseAdapterFlavor: 'postgres',
  cacheAdapterFlavor: 'redis',
});

class TestEntityPrivacyPolicy extends EntityPrivacyPolicy<any, string, ViewerContext, any, any> {
  protected override getReadRules(): readonly PrivacyPolicyRule<
    any,
    string,
    ViewerContext,
    any,
    any
  >[] {
    return [new AlwaysAllowPrivacyPolicyRule<any, string, ViewerContext, any, any>()];
  }

  protected override getCreateRules(): readonly PrivacyPolicyRule<
    any,
    string,
    ViewerContext,
    any,
    any
  >[] {
    return [new AlwaysAllowPrivacyPolicyRule<any, string, ViewerContext, any, any>()];
  }

  protected override getUpdateRules(): readonly PrivacyPolicyRule<
    any,
    string,
    ViewerContext,
    any,
    any
  >[] {
    return [new AlwaysAllowPrivacyPolicyRule<any, string, ViewerContext, any, any>()];
  }

  protected override getDeleteRules(): readonly PrivacyPolicyRule<
    any,
    string,
    ViewerContext,
    any,
    any
  >[] {
    return [new AlwaysAllowPrivacyPolicyRule<any, string, ViewerContext, any, any>()];
  }
}

class OneTestEntity extends Entity<TestFields, string, ViewerContext, OneTestFields> {
  constructor(constructorParams: {
    viewerContext: ViewerContext;
    id: string;
    databaseFields: Readonly<TestFields>;
    selectedFields: Readonly<Pick<TestFields, OneTestFields>>;
  }) {
    if (constructorParams.selectedFields.entity_type !== EntityType.ONE) {
      throw new Error('OneTestEntity must be instantiated with one data');
    }
    super(constructorParams);
  }

  static defineCompanionDefinition(): EntityCompanionDefinition<
    TestFields,
    string,
    ViewerContext,
    OneTestEntity,
    TestEntityPrivacyPolicy,
    OneTestFields
  > {
    return {
      entityClass: OneTestEntity,
      entityConfiguration: testEntityConfiguration,
      privacyPolicyClass: TestEntityPrivacyPolicy,
      entitySelectedFields: ['id', 'entity_type', 'common_other_field'],
    };
  }
}

class TwoTestEntity extends Entity<TestFields, string, ViewerContext, TwoTestFields> {
  constructor(constructorParams: {
    viewerContext: ViewerContext;
    id: string;
    databaseFields: Readonly<TestFields>;
    selectedFields: Readonly<Pick<TestFields, TwoTestFields>>;
  }) {
    if (constructorParams.selectedFields.entity_type !== EntityType.TWO) {
      throw new Error('TwoTestEntity must be instantiated with two data');
    }
    super(constructorParams);
  }

  static defineCompanionDefinition(): EntityCompanionDefinition<
    TestFields,
    string,
    ViewerContext,
    TwoTestEntity,
    TestEntityPrivacyPolicy,
    TwoTestFields
  > {
    return {
      entityClass: TwoTestEntity,
      entityConfiguration: testEntityConfiguration,
      privacyPolicyClass: TestEntityPrivacyPolicy,
      entitySelectedFields: ['id', 'other_field', 'common_other_field', 'entity_type'],
    };
  }
}

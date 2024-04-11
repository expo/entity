import Entity from '../../Entity';
import { EntityCompanionDefinition } from '../../EntityCompanionProvider';
import EntityConfiguration from '../../EntityConfiguration';
import { UUIDField, EnumField, StringField } from '../../EntityFields';
import EntityPrivacyPolicy from '../../EntityPrivacyPolicy';
import { successfulResults, failedResults } from '../../entityUtils';
import AlwaysAllowPrivacyPolicyRule from '../../rules/AlwaysAllowPrivacyPolicyRule';
import TestViewerContext from '../../testfixtures/TestViewerContext';
import { createUnitTestEntityCompanionProvider } from '../../utils/testing/createUnitTestEntityCompanionProvider';

describe('Two entities backed by the same table', () => {
  test('load by different types', async () => {
    const companionProvider = createUnitTestEntityCompanionProvider();
    const viewerContext = new TestViewerContext(companionProvider);

    const one = await OneTestEntity.creator(viewerContext, viewerContext.getQueryContext())
      .setField('entity_type', EntityType.ONE)
      .setField('common_other_field', 'wat')
      .enforceCreateAsync();

    const two = await TwoTestEntity.creator(viewerContext, viewerContext.getQueryContext())
      .setField('entity_type', EntityType.TWO)
      .setField('other_field', 'blah')
      .setField('common_other_field', 'wat')
      .enforceCreateAsync();

    expect(one).toBeInstanceOf(OneTestEntity);
    expect(two).toBeInstanceOf(TwoTestEntity);

    await expect(
      TwoTestEntity.loader(viewerContext, viewerContext.getQueryContext())
        .enforcing()
        .loadByIDAsync(one.getID())
    ).rejects.toThrowError('TwoTestEntity must be instantiated with two data');

    await expect(
      OneTestEntity.loader(viewerContext, viewerContext.getQueryContext())
        .enforcing()
        .loadByIDAsync(two.getID())
    ).rejects.toThrowError('OneTestEntity must be instantiated with one data');

    const manyResults = await OneTestEntity.loader(
      viewerContext,
      viewerContext.getQueryContext()
    ).loadManyByFieldEqualingAsync('common_other_field', 'wat');
    const successfulManyResults = successfulResults(manyResults);
    const failedManyResults = failedResults(manyResults);

    expect(successfulManyResults).toHaveLength(1);
    expect(failedManyResults).toHaveLength(1);

    expect(successfulManyResults[0]!.enforceValue().getID()).toEqual(one.getID());
    expect(failedManyResults[0]!.enforceError().message).toEqual(
      'OneTestEntity must be instantiated with one data'
    );

    const fieldEqualityConjunctionResults = await OneTestEntity.loader(
      viewerContext,
      viewerContext.getQueryContext()
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

class TestEntityPrivacyPolicy extends EntityPrivacyPolicy<
  any,
  string,
  TestViewerContext,
  any,
  any
> {
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<any, string, TestViewerContext, any, any>(),
  ];
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<any, string, TestViewerContext, any, any>(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<any, string, TestViewerContext, any, any>(),
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<any, string, TestViewerContext, any, any>(),
  ];
}

class OneTestEntity extends Entity<TestFields, string, TestViewerContext, OneTestFields> {
  constructor(constructorParams: {
    viewerContext: TestViewerContext;
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
    TestViewerContext,
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

class TwoTestEntity extends Entity<TestFields, string, TestViewerContext, TwoTestFields> {
  constructor(constructorParams: {
    viewerContext: TestViewerContext;
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
    TestViewerContext,
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

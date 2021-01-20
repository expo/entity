import { enforceAsyncResult } from '@expo/results';

import Entity from '../Entity';
import EntityCompanionProvider, { EntityCompanionDefinition } from '../EntityCompanionProvider';
import EntityConfiguration from '../EntityConfiguration';
import { UUIDField } from '../EntityFields';
import EntityPrivacyPolicy from '../EntityPrivacyPolicy';
import { EntityQueryContext } from '../EntityQueryContext';
import ViewerContext from '../ViewerContext';
import { enforceResultsAsync } from '../entityUtils';
import EntityNotAuthorizedError from '../errors/EntityNotAuthorizedError';
import AlwaysAllowPrivacyPolicyRule from '../rules/AlwaysAllowPrivacyPolicyRule';
import AlwaysDenyPrivacyPolicyRule from '../rules/AlwaysDenyPrivacyPolicyRule';
import PrivacyPolicyRule, { RuleEvaluationResult } from '../rules/PrivacyPolicyRule';
import { createUnitTestEntityCompanionProvider } from '../utils/testing/createUnitTestEntityCompanionProvider';

class TestUserViewerContext extends ViewerContext {
  constructor(entityCompanionProvider: EntityCompanionProvider, private readonly userID: string) {
    super(entityCompanionProvider);
  }

  getUserID(): string {
    return this.userID;
  }
}

type BlahFields = {
  id: string;
  ownerID: string;
};

class BlahEntity extends Entity<BlahFields, string, TestUserViewerContext> {
  static getCompanionDefinition(): EntityCompanionDefinition<
    BlahFields,
    string,
    TestUserViewerContext,
    BlahEntity,
    BlahEntityPrivacyPolicy
  > {
    return blahCompanion;
  }
}

class DenyIfNotOwnerPrivacyPolicyRule extends PrivacyPolicyRule<
  BlahFields,
  string,
  TestUserViewerContext,
  BlahEntity
> {
  async evaluateAsync(
    viewerContext: TestUserViewerContext,
    _queryContext: EntityQueryContext,
    entity: BlahEntity
  ): Promise<RuleEvaluationResult> {
    if (viewerContext.getUserID() === entity.getField('ownerID')) {
      return RuleEvaluationResult.SKIP;
    }
    return RuleEvaluationResult.DENY;
  }
}

class BlahEntityPrivacyPolicy extends EntityPrivacyPolicy<
  BlahFields,
  string,
  ViewerContext,
  BlahEntity
> {
  protected readonly createRules = [
    new DenyIfNotOwnerPrivacyPolicyRule(),
    new AlwaysAllowPrivacyPolicyRule<BlahFields, string, ViewerContext, BlahEntity>(),
  ];
  protected readonly readRules = [
    new DenyIfNotOwnerPrivacyPolicyRule(),
    new AlwaysAllowPrivacyPolicyRule<BlahFields, string, ViewerContext, BlahEntity>(),
  ];
  protected readonly updateRules = [
    new DenyIfNotOwnerPrivacyPolicyRule(),
    new AlwaysAllowPrivacyPolicyRule<BlahFields, string, ViewerContext, BlahEntity>(),
  ];
  protected readonly deleteRules = [
    new AlwaysDenyPrivacyPolicyRule<BlahFields, string, ViewerContext, BlahEntity>(),
  ];
}

const blahCompanion = new EntityCompanionDefinition({
  entityClass: BlahEntity,
  entityConfiguration: new EntityConfiguration<BlahFields>({
    idField: 'id',
    tableName: 'blah_table',
    schema: {
      id: new UUIDField({
        columnName: 'id',
        cache: true,
      }),
      ownerID: new UUIDField({
        columnName: 'owner_id',
      }),
    },
    databaseAdapterFlavor: 'postgres',
    cacheAdapterFlavor: 'redis',
  }),
  privacyPolicyClass: BlahEntityPrivacyPolicy,
});

it('runs through a common workflow', async () => {
  // will be one entity companion provider for each request, so
  // share amongst all VCs created in that request
  const entityCompanionProvider = createUnitTestEntityCompanionProvider();
  const vc1 = new TestUserViewerContext(entityCompanionProvider, '1');
  const vc2 = new TestUserViewerContext(entityCompanionProvider, '2');

  const blahOwner1 = await enforceAsyncResult(
    BlahEntity.creator(vc1).setField('ownerID', vc1.getUserID()!).createAsync()
  );

  await enforceAsyncResult(
    BlahEntity.creator(vc1).setField('ownerID', vc1.getUserID()!).createAsync()
  );

  const blahOwner2 = await enforceAsyncResult(
    BlahEntity.creator(vc2).setField('ownerID', vc2.getUserID()!).createAsync()
  );

  // sanity check created objects
  expect(blahOwner1.getField('ownerID')).toEqual(vc1.getUserID());
  expect(blahOwner2.getField('ownerID')).toEqual(vc2.getUserID());

  // check that two people can't read each others data
  await expect(
    enforceAsyncResult(BlahEntity.loader(vc1).loadByIDAsync(blahOwner2.getID()))
  ).rejects.toBeInstanceOf(EntityNotAuthorizedError);
  await expect(
    enforceAsyncResult(BlahEntity.loader(vc2).loadByIDAsync(blahOwner1.getID()))
  ).rejects.toBeInstanceOf(EntityNotAuthorizedError);

  // check that all of owner 1's objects can be loaded
  const results = await enforceResultsAsync(
    BlahEntity.loader(vc1).loadManyByFieldEqualingAsync('ownerID', vc1.getUserID()!)
  );
  expect(results).toHaveLength(2);

  // check that two people can't create objects owned by others
  await expect(
    enforceAsyncResult(
      BlahEntity.creator(vc2).setField('ownerID', blahOwner1.getID()).createAsync()
    )
  ).rejects.toBeInstanceOf(EntityNotAuthorizedError);

  // check that empty load many returns nothing
  const results2 = await BlahEntity.loader(vc1).loadManyByFieldEqualingManyAsync('ownerID', []);
  for (const value in results2.values) {
    expect(value).toHaveLength(0);
  }

  // check that the user can't delete their own data (as specified by privacy rules)
  await expect(enforceAsyncResult(BlahEntity.deleteAsync(blahOwner2))).rejects.toBeInstanceOf(
    EntityNotAuthorizedError
  );
});

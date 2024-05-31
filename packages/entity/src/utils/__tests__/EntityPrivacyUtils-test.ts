import Entity from '../../Entity';
import { EntityCompanionDefinition } from '../../EntityCompanionProvider';
import EntityConfiguration from '../../EntityConfiguration';
import { EntityEdgeDeletionBehavior } from '../../EntityFieldDefinition';
import { UUIDField } from '../../EntityFields';
import EntityPrivacyPolicy, {
  EntityPrivacyPolicyEvaluationContext,
} from '../../EntityPrivacyPolicy';
import { EntityQueryContext } from '../../EntityQueryContext';
import ReadonlyEntity from '../../ReadonlyEntity';
import ViewerContext from '../../ViewerContext';
import AlwaysAllowPrivacyPolicyRule from '../../rules/AlwaysAllowPrivacyPolicyRule';
import AlwaysDenyPrivacyPolicyRule from '../../rules/AlwaysDenyPrivacyPolicyRule';
import { RuleEvaluationResult } from '../../rules/PrivacyPolicyRule';
import { canViewerDeleteAsync, canViewerUpdateAsync } from '../EntityPrivacyUtils';
import { createUnitTestEntityCompanionProvider } from '../testing/createUnitTestEntityCompanionProvider';

describe(canViewerUpdateAsync, () => {
  it('appropriately executes update privacy policy', async () => {
    const companionProvider = createUnitTestEntityCompanionProvider();
    const viewerContext = new ViewerContext(companionProvider);
    const testEntity = await SimpleTestDenyDeleteEntity.creator(viewerContext).enforceCreateAsync();
    const canViewerUpdate = await canViewerUpdateAsync(SimpleTestDenyDeleteEntity, testEntity);
    expect(canViewerUpdate).toBe(true);
  });

  it('denies when policy denies', async () => {
    const companionProvider = createUnitTestEntityCompanionProvider();
    const viewerContext = new ViewerContext(companionProvider);
    const testEntity = await SimpleTestDenyUpdateEntity.creator(viewerContext).enforceCreateAsync();
    const canViewerUpdate = await canViewerUpdateAsync(SimpleTestDenyUpdateEntity, testEntity);
    expect(canViewerUpdate).toBe(false);
  });

  it('rethrows non-authorization errors', async () => {
    const companionProvider = createUnitTestEntityCompanionProvider();
    const viewerContext = new ViewerContext(companionProvider);
    const testEntity = await SimpleTestThrowOtherErrorEntity.creator(
      viewerContext
    ).enforceCreateAsync();
    await expect(canViewerUpdateAsync(SimpleTestThrowOtherErrorEntity, testEntity)).rejects.toThrow(
      'update error'
    );
  });
});

describe(canViewerDeleteAsync, () => {
  it('appropriately executes update privacy policy', async () => {
    const companionProvider = createUnitTestEntityCompanionProvider();
    const viewerContext = new ViewerContext(companionProvider);
    const testEntity = await SimpleTestDenyUpdateEntity.creator(viewerContext).enforceCreateAsync();
    const canViewerDelete = await canViewerDeleteAsync(SimpleTestDenyUpdateEntity, testEntity);
    expect(canViewerDelete).toBe(true);
  });

  it('denies when policy denies', async () => {
    const companionProvider = createUnitTestEntityCompanionProvider();
    const viewerContext = new ViewerContext(companionProvider);
    const testEntity = await SimpleTestDenyDeleteEntity.creator(viewerContext).enforceCreateAsync();
    const canViewerDelete = await canViewerDeleteAsync(SimpleTestDenyDeleteEntity, testEntity);
    expect(canViewerDelete).toBe(false);
  });

  it('denies when recursive policy denies for CASCADE_DELETE', async () => {
    const companionProvider = createUnitTestEntityCompanionProvider();
    const viewerContext = new ViewerContext(companionProvider);
    const testEntity = await SimpleTestDenyUpdateEntity.creator(viewerContext).enforceCreateAsync();
    // add another entity referencing testEntity that would cascade deletion to itself when testEntity is deleted
    await LeafDenyDeleteEntity.creator(viewerContext)
      .setField('simple_test_deny_update_cascade_delete_id', testEntity.getID())
      .enforceCreateAsync();
    const canViewerDelete = await canViewerDeleteAsync(SimpleTestDenyUpdateEntity, testEntity);
    expect(canViewerDelete).toBe(false);
  });

  it('denies when recursive policy denies for SET_NULL', async () => {
    const companionProvider = createUnitTestEntityCompanionProvider();
    const viewerContext = new ViewerContext(companionProvider);
    const testEntity = await SimpleTestDenyUpdateEntity.creator(viewerContext).enforceCreateAsync();
    // add another entity referencing testEntity that would set null to its column when testEntity is deleted
    await LeafDenyUpdateEntity.creator(viewerContext)
      .setField('simple_test_deny_update_set_null_id', testEntity.getID())
      .enforceCreateAsync();
    const canViewerDelete = await canViewerDeleteAsync(SimpleTestDenyUpdateEntity, testEntity);
    expect(canViewerDelete).toBe(false);
  });

  it('allows when recursive policy allows for CASCADE_DELETE and SET_NULL', async () => {
    const companionProvider = createUnitTestEntityCompanionProvider();
    const viewerContext = new ViewerContext(companionProvider);
    const testEntity = await SimpleTestDenyUpdateEntity.creator(viewerContext).enforceCreateAsync();
    // add another entity referencing testEntity that would cascade deletion to itself when testEntity is deleted
    await LeafDenyUpdateEntity.creator(viewerContext)
      .setField('simple_test_deny_update_cascade_delete_id', testEntity.getID())
      .enforceCreateAsync();
    // add another entity referencing testEntity that would set null to its column when testEntity is deleted
    await LeafDenyDeleteEntity.creator(viewerContext)
      .setField('simple_test_deny_update_set_null_id', testEntity.getID())
      .enforceCreateAsync();

    const canViewerDelete = await canViewerDeleteAsync(SimpleTestDenyUpdateEntity, testEntity);
    expect(canViewerDelete).toBe(true);
  });

  it('rethrows non-authorization errors', async () => {
    const companionProvider = createUnitTestEntityCompanionProvider();
    const viewerContext = new ViewerContext(companionProvider);
    const testEntity = await SimpleTestThrowOtherErrorEntity.creator(
      viewerContext
    ).enforceCreateAsync();
    await expect(
      canViewerDeleteAsync(SimpleTestThrowOtherErrorEntity, testEntity)
    ).rejects.toThrowError('delete error');
  });

  it('returns false when edge cannot be read', async () => {
    const companionProvider = createUnitTestEntityCompanionProvider();
    const viewerContext = new ViewerContext(companionProvider);
    const testEntity = await SimpleTestDenyUpdateEntity.creator(viewerContext).enforceCreateAsync();
    await LeafDenyReadEntity.creator(viewerContext)
      .setField('simple_test_id', testEntity.getID())
      .enforceCreateAsync();
    const canViewerDelete = await canViewerDeleteAsync(SimpleTestDenyUpdateEntity, testEntity);
    expect(canViewerDelete).toBe(false);
  });

  it('rethrows non-authorization edge read errors', async () => {
    const companionProvider = createUnitTestEntityCompanionProvider();
    const viewerContext = new ViewerContext(companionProvider);
    const testEntity = await SimpleTestDenyUpdateEntity.creator(viewerContext).enforceCreateAsync();
    await SimpleTestThrowOtherErrorEntity.creator(viewerContext)
      .setField('simple_test_id', testEntity.getID())
      .enforceCreateAsync();
    await expect(canViewerDeleteAsync(SimpleTestDenyUpdateEntity, testEntity)).rejects.toThrowError(
      'read in cascading delete error'
    );
  });

  it('supports running within a transaction', async () => {
    const companionProvider = createUnitTestEntityCompanionProvider();
    const viewerContext = new ViewerContext(companionProvider);
    const canViewerDelete = await viewerContext.runInTransactionForDatabaseAdaptorFlavorAsync(
      'postgres',
      async (queryContext) => {
        const testEntity = await SimpleTestDenyUpdateEntity.creator(
          viewerContext,
          queryContext
        ).enforceCreateAsync();
        await LeafDenyReadEntity.creator(viewerContext, queryContext)
          .setField('simple_test_id', testEntity.getID())
          .enforceCreateAsync();
        // this would fail if transactions weren't supported or correctly passed through
        return await canViewerDeleteAsync(SimpleTestDenyUpdateEntity, testEntity, queryContext);
      }
    );

    expect(canViewerDelete).toBe(true);
  });
});

type TestEntityFields = {
  id: string;
};

type TestLeafDenyDeleteFields = {
  id: string;
  simple_test_deny_update_cascade_delete_id: string | null;
  simple_test_deny_update_set_null_id: string | null;
};

type TestLeafDenyUpdateFields = {
  id: string;
  unused_other_association: string | null;
  simple_test_deny_update_set_null_id: string | null;
  simple_test_deny_update_cascade_delete_id: string | null;
};

type TestLeafDenyReadFields = {
  id: string;
  simple_test_id: string | null;
};

type TestEntityThrowOtherErrorFields = {
  id: string;
  simple_test_id: string | null;
};

class DenyUpdateEntityPrivacyPolicy<
  TFields extends object,
  TID extends NonNullable<TFields[TSelectedFields]>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields
> extends EntityPrivacyPolicy<TFields, TID, TViewerContext, TEntity, TSelectedFields> {
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<TFields, TID, TViewerContext, TEntity, TSelectedFields>(),
  ];
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<TFields, TID, TViewerContext, TEntity, TSelectedFields>(),
  ];
  protected override readonly updateRules = [
    new AlwaysDenyPrivacyPolicyRule<TFields, TID, TViewerContext, TEntity, TSelectedFields>(),
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<TFields, TID, TViewerContext, TEntity, TSelectedFields>(),
  ];
}

class DenyDeleteEntityPrivacyPolicy<
  TFields extends object,
  TID extends NonNullable<TFields[TSelectedFields]>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields
> extends EntityPrivacyPolicy<TFields, TID, TViewerContext, TEntity, TSelectedFields> {
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<TFields, TID, TViewerContext, TEntity, TSelectedFields>(),
  ];
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<TFields, TID, TViewerContext, TEntity, TSelectedFields>(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<TFields, TID, TViewerContext, TEntity, TSelectedFields>(),
  ];
  protected override readonly deleteRules = [
    new AlwaysDenyPrivacyPolicyRule<TFields, TID, TViewerContext, TEntity, TSelectedFields>(),
  ];
}

class ThrowOtherErrorEntityPrivacyPolicy<
  TFields extends object,
  TID extends NonNullable<TFields[TSelectedFields]>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields
> extends EntityPrivacyPolicy<TFields, TID, TViewerContext, TEntity, TSelectedFields> {
  protected override readonly readRules = [
    {
      async evaluateAsync(
        _viewerContext: TViewerContext,
        _queryContext: EntityQueryContext,
        evaluationContext: EntityPrivacyPolicyEvaluationContext,
        _entity: TEntity
      ): Promise<RuleEvaluationResult> {
        if (evaluationContext.cascadingDeleteCause) {
          throw new Error('read in cascading delete error');
        }
        return RuleEvaluationResult.SKIP;
      },
    },
    new AlwaysAllowPrivacyPolicyRule<TFields, TID, TViewerContext, TEntity, TSelectedFields>(),
  ];
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<TFields, TID, TViewerContext, TEntity, TSelectedFields>(),
  ];
  protected override readonly updateRules = [
    {
      async evaluateAsync(): Promise<RuleEvaluationResult> {
        throw new Error('update error');
      },
    },
  ];
  protected override readonly deleteRules = [
    {
      async evaluateAsync(): Promise<RuleEvaluationResult> {
        throw new Error('delete error');
      },
    },
  ];
}

class DenyReadEntityPrivacyPolicy<
  TFields extends object,
  TID extends NonNullable<TFields[TSelectedFields]>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields
> extends EntityPrivacyPolicy<TFields, TID, TViewerContext, TEntity, TSelectedFields> {
  protected override readonly readRules = [
    {
      async evaluateAsync(
        _viewerContext: TViewerContext,
        queryContext: EntityQueryContext,
        evaluationContext: EntityPrivacyPolicyEvaluationContext,
        _entity: TEntity
      ): Promise<RuleEvaluationResult> {
        if (queryContext.isInTransaction()) {
          return RuleEvaluationResult.ALLOW;
        }
        return evaluationContext.cascadingDeleteCause
          ? RuleEvaluationResult.SKIP
          : RuleEvaluationResult.ALLOW;
      },
    },
  ];
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<TFields, TID, TViewerContext, TEntity, TSelectedFields>(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<TFields, TID, TViewerContext, TEntity, TSelectedFields>(),
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<TFields, TID, TViewerContext, TEntity, TSelectedFields>(),
  ];
}

class LeafDenyUpdateEntity extends Entity<TestLeafDenyUpdateFields, string, ViewerContext> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    TestLeafDenyUpdateFields,
    string,
    ViewerContext,
    LeafDenyUpdateEntity,
    DenyUpdateEntityPrivacyPolicy<
      TestLeafDenyUpdateFields,
      string,
      ViewerContext,
      LeafDenyUpdateEntity
    >
  > {
    return {
      entityClass: LeafDenyUpdateEntity,
      entityConfiguration: new EntityConfiguration<TestLeafDenyUpdateFields>({
        idField: 'id',
        tableName: 'leaf_1',
        schema: {
          id: new UUIDField({
            columnName: 'custom_id',
          }),
          // to ensure edge traversal doesn't process other edges
          unused_other_association: new UUIDField({
            columnName: 'unused_other_association',
            association: {
              associatedEntityClass: LeafDenyDeleteEntity,
              edgeDeletionBehavior: EntityEdgeDeletionBehavior.SET_NULL,
            },
          }),
          // deletion behavior should fail since this entity can't be updated and a SET NULL does an update
          simple_test_deny_update_set_null_id: new UUIDField({
            columnName: 'simple_test_deny_update_set_null_id',
            association: {
              associatedEntityClass: SimpleTestDenyUpdateEntity,
              edgeDeletionBehavior: EntityEdgeDeletionBehavior.SET_NULL,
            },
          }),
          // deletion behavior should succeed since this entity can be deleted
          simple_test_deny_update_cascade_delete_id: new UUIDField({
            columnName: 'simple_test_deny_update_cascade_delete_id',
            association: {
              associatedEntityClass: SimpleTestDenyUpdateEntity,
              edgeDeletionBehavior: EntityEdgeDeletionBehavior.CASCADE_DELETE,
            },
          }),
        },
        databaseAdapterFlavor: 'postgres',
        cacheAdapterFlavor: 'redis',
      }),
      privacyPolicyClass: DenyUpdateEntityPrivacyPolicy,
    };
  }
}

class LeafDenyDeleteEntity extends Entity<TestLeafDenyDeleteFields, string, ViewerContext> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    TestLeafDenyDeleteFields,
    string,
    ViewerContext,
    LeafDenyDeleteEntity,
    DenyDeleteEntityPrivacyPolicy<
      TestLeafDenyDeleteFields,
      string,
      ViewerContext,
      LeafDenyDeleteEntity
    >
  > {
    return {
      entityClass: LeafDenyDeleteEntity,
      entityConfiguration: new EntityConfiguration<TestLeafDenyDeleteFields>({
        idField: 'id',
        tableName: 'leaf_2',
        schema: {
          id: new UUIDField({
            columnName: 'custom_id',
          }),
          // deletion behavior should fail since this entity can't be deleted
          simple_test_deny_update_cascade_delete_id: new UUIDField({
            columnName: 'simple_test_deny_update_cascade_delete_id',
            association: {
              associatedEntityClass: SimpleTestDenyUpdateEntity,
              edgeDeletionBehavior: EntityEdgeDeletionBehavior.CASCADE_DELETE,
            },
          }),
          // deletion behavior should succeed since this entity can be updated and a SET NULL does an update
          simple_test_deny_update_set_null_id: new UUIDField({
            columnName: 'simple_test_deny_update_set_null_id',
            association: {
              associatedEntityClass: SimpleTestDenyUpdateEntity,
              edgeDeletionBehavior: EntityEdgeDeletionBehavior.SET_NULL,
            },
          }),
        },
        databaseAdapterFlavor: 'postgres',
        cacheAdapterFlavor: 'redis',
      }),
      privacyPolicyClass: DenyDeleteEntityPrivacyPolicy,
    };
  }
}

class LeafDenyReadEntity extends Entity<TestLeafDenyReadFields, string, ViewerContext> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    TestLeafDenyReadFields,
    string,
    ViewerContext,
    LeafDenyReadEntity,
    DenyReadEntityPrivacyPolicy<TestLeafDenyReadFields, string, ViewerContext, LeafDenyReadEntity>
  > {
    return {
      entityClass: LeafDenyReadEntity,
      entityConfiguration: new EntityConfiguration<TestLeafDenyReadFields>({
        idField: 'id',
        tableName: 'leaf_4',
        inboundEdges: [],
        schema: {
          id: new UUIDField({
            columnName: 'custom_id',
          }),
          simple_test_id: new UUIDField({
            columnName: 'simple_test_id',
            association: {
              associatedEntityClass: SimpleTestDenyUpdateEntity,
              associatedEntityLookupByField: 'id',
              edgeDeletionBehavior: EntityEdgeDeletionBehavior.SET_NULL,
            },
          }),
        },
        databaseAdapterFlavor: 'postgres',
        cacheAdapterFlavor: 'redis',
      }),
      privacyPolicyClass: DenyReadEntityPrivacyPolicy,
    };
  }
}

class SimpleTestDenyUpdateEntity extends Entity<TestEntityFields, string, ViewerContext> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    TestEntityFields,
    string,
    ViewerContext,
    SimpleTestDenyUpdateEntity,
    DenyUpdateEntityPrivacyPolicy<
      TestEntityFields,
      string,
      ViewerContext,
      SimpleTestDenyUpdateEntity
    >
  > {
    return {
      entityClass: SimpleTestDenyUpdateEntity,
      entityConfiguration: new EntityConfiguration<TestEntityFields>({
        idField: 'id',
        tableName: 'blah',
        inboundEdges: [
          LeafDenyUpdateEntity,
          LeafDenyDeleteEntity,
          LeafDenyReadEntity,
          SimpleTestThrowOtherErrorEntity,
        ],
        schema: {
          id: new UUIDField({
            columnName: 'custom_id',
          }),
        },
        databaseAdapterFlavor: 'postgres',
        cacheAdapterFlavor: 'redis',
      }),
      privacyPolicyClass: DenyUpdateEntityPrivacyPolicy,
    };
  }
}

class SimpleTestDenyDeleteEntity extends Entity<TestEntityFields, string, ViewerContext> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    TestEntityFields,
    string,
    ViewerContext,
    SimpleTestDenyDeleteEntity,
    DenyDeleteEntityPrivacyPolicy<
      TestEntityFields,
      string,
      ViewerContext,
      SimpleTestDenyDeleteEntity
    >
  > {
    return {
      entityClass: SimpleTestDenyDeleteEntity,
      entityConfiguration: new EntityConfiguration<TestEntityFields>({
        idField: 'id',
        tableName: 'blah_2',
        inboundEdges: [
          LeafDenyUpdateEntity,
          LeafDenyDeleteEntity,
          LeafDenyReadEntity,
          SimpleTestThrowOtherErrorEntity,
        ],
        schema: {
          id: new UUIDField({
            columnName: 'custom_id',
          }),
        },
        databaseAdapterFlavor: 'postgres',
        cacheAdapterFlavor: 'redis',
      }),
      privacyPolicyClass: DenyDeleteEntityPrivacyPolicy,
    };
  }
}

class SimpleTestThrowOtherErrorEntity extends Entity<
  TestEntityThrowOtherErrorFields,
  string,
  ViewerContext
> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    TestEntityThrowOtherErrorFields,
    string,
    ViewerContext,
    SimpleTestThrowOtherErrorEntity,
    ThrowOtherErrorEntityPrivacyPolicy<
      TestEntityThrowOtherErrorFields,
      string,
      ViewerContext,
      SimpleTestThrowOtherErrorEntity
    >
  > {
    return {
      entityClass: SimpleTestThrowOtherErrorEntity,
      entityConfiguration: new EntityConfiguration<TestEntityThrowOtherErrorFields>({
        idField: 'id',
        tableName: 'blah_3',
        inboundEdges: [],
        schema: {
          id: new UUIDField({
            columnName: 'custom_id',
          }),
          simple_test_id: new UUIDField({
            columnName: 'simple_test_id',
            association: {
              associatedEntityClass: SimpleTestDenyUpdateEntity,
              associatedEntityLookupByField: 'id',
              edgeDeletionBehavior: EntityEdgeDeletionBehavior.SET_NULL,
            },
          }),
        },
        databaseAdapterFlavor: 'postgres',
        cacheAdapterFlavor: 'redis',
      }),
      privacyPolicyClass: ThrowOtherErrorEntityPrivacyPolicy,
    };
  }
}

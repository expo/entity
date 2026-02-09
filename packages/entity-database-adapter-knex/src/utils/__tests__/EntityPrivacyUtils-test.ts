import {
  Entity,
  EntityCompanionDefinition,
  EntityConfiguration,
  EntityEdgeDeletionBehavior,
  UUIDField,
  EntityAuthorizationAction,
  EntityPrivacyPolicy,
  EntityPrivacyPolicyEvaluationContext,
  EntityQueryContext,
  ReadonlyEntity,
  ViewerContext,
  AlwaysAllowPrivacyPolicyRule,
  AlwaysDenyPrivacyPolicyRule,
  RuleEvaluationResult,
} from '@expo/entity';
import { describe, expect, it } from '@jest/globals';
import nullthrows from 'nullthrows';

import { createUnitTestPostgresEntityCompanionProvider } from '../../__tests__/fixtures/createUnitTestPostgresEntityCompanionProvider';
import {
  canViewerDeleteAsync,
  canViewerUpdateAsync,
  EntityPrivacyEvaluationResult,
  EntityPrivacyEvaluationResultFailure,
  getCanViewerDeleteResultAsync,
  getCanViewerUpdateResultAsync,
} from '../EntityPrivacyUtils';

function assertEntityPrivacyEvaluationResultFailure(
  evaluationResult: EntityPrivacyEvaluationResult,
): asserts evaluationResult is EntityPrivacyEvaluationResultFailure {
  if (evaluationResult.allowed) {
    throw new Error('Evaluation result not failure');
  }
}

function expectAuthorizationError(
  evaluationResult: EntityPrivacyEvaluationResult,
  { entityId, action }: { entityId: string; action: EntityAuthorizationAction },
): void {
  expect(evaluationResult.allowed).toBe(false);
  assertEntityPrivacyEvaluationResultFailure(evaluationResult);
  const authorizationErrors = evaluationResult.authorizationErrors;
  expect(authorizationErrors).toHaveLength(1);
  const authorizationError = nullthrows(authorizationErrors[0]);
  expect(authorizationError.message).toContain(entityId);
  expect(authorizationError.message).toContain(EntityAuthorizationAction[action]);
}

describe(canViewerUpdateAsync, () => {
  it('appropriately executes update privacy policy', async () => {
    const companionProvider = createUnitTestPostgresEntityCompanionProvider();
    const viewerContext = new ViewerContext(companionProvider);
    const testEntity = await SimpleTestDenyDeleteEntity.creator(viewerContext).createAsync();
    const canViewerUpdate = await canViewerUpdateAsync(SimpleTestDenyDeleteEntity, testEntity);
    expect(canViewerUpdate).toBe(true);
    const canViewerUpdateResult = await getCanViewerUpdateResultAsync(
      SimpleTestDenyDeleteEntity,
      testEntity,
    );
    expect(canViewerUpdateResult.allowed).toBe(true);
  });

  it('denies when policy denies', async () => {
    const companionProvider = createUnitTestPostgresEntityCompanionProvider();
    const viewerContext = new ViewerContext(companionProvider);
    const testEntity = await SimpleTestDenyUpdateEntity.creator(viewerContext).createAsync();
    const canViewerUpdate = await canViewerUpdateAsync(SimpleTestDenyUpdateEntity, testEntity);
    expect(canViewerUpdate).toBe(false);
    const canViewerUpdateResult = await getCanViewerUpdateResultAsync(
      SimpleTestDenyUpdateEntity,
      testEntity,
    );
    expectAuthorizationError(canViewerUpdateResult, {
      entityId: testEntity.getID(),
      action: EntityAuthorizationAction.UPDATE,
    });
  });

  it('rethrows non-authorization errors', async () => {
    const companionProvider = createUnitTestPostgresEntityCompanionProvider();
    const viewerContext = new ViewerContext(companionProvider);
    const testEntity = await SimpleTestThrowOtherErrorEntity.creator(viewerContext).createAsync();
    await expect(canViewerUpdateAsync(SimpleTestThrowOtherErrorEntity, testEntity)).rejects.toThrow(
      'update error',
    );
    await expect(
      getCanViewerUpdateResultAsync(SimpleTestThrowOtherErrorEntity, testEntity),
    ).rejects.toThrow('update error');
  });
});

describe(canViewerDeleteAsync, () => {
  it('appropriately executes update privacy policy', async () => {
    const companionProvider = createUnitTestPostgresEntityCompanionProvider();
    const viewerContext = new ViewerContext(companionProvider);
    const testEntity = await SimpleTestDenyUpdateEntity.creator(viewerContext).createAsync();
    const canViewerDelete = await canViewerDeleteAsync(SimpleTestDenyUpdateEntity, testEntity);
    expect(canViewerDelete).toBe(true);
    const canViewerDeleteResult = await getCanViewerDeleteResultAsync(
      SimpleTestDenyUpdateEntity,
      testEntity,
    );
    expect(canViewerDeleteResult.allowed).toBe(true);
  });

  it('denies when policy denies', async () => {
    const companionProvider = createUnitTestPostgresEntityCompanionProvider();
    const viewerContext = new ViewerContext(companionProvider);
    const testEntity = await SimpleTestDenyDeleteEntity.creator(viewerContext).createAsync();
    const canViewerDelete = await canViewerDeleteAsync(SimpleTestDenyDeleteEntity, testEntity);
    expect(canViewerDelete).toBe(false);
    const canViewerDeleteResult = await getCanViewerDeleteResultAsync(
      SimpleTestDenyDeleteEntity,
      testEntity,
    );
    expectAuthorizationError(canViewerDeleteResult, {
      entityId: testEntity.getID(),
      action: EntityAuthorizationAction.DELETE,
    });
  });

  it('denies when recursive policy denies for CASCADE_DELETE', async () => {
    const companionProvider = createUnitTestPostgresEntityCompanionProvider();
    const viewerContext = new ViewerContext(companionProvider);
    const testEntity = await SimpleTestDenyUpdateEntity.creator(viewerContext).createAsync();
    // add another entity referencing testEntity that would cascade deletion to itself when testEntity is deleted
    const leafEntity = await LeafDenyDeleteEntity.creator(viewerContext)
      .setField('simple_test_deny_update_cascade_delete_id', testEntity.getID())
      .createAsync();
    const canViewerDelete = await canViewerDeleteAsync(SimpleTestDenyUpdateEntity, testEntity);
    expect(canViewerDelete).toBe(false);
    const canViewerDeleteResult = await getCanViewerDeleteResultAsync(
      SimpleTestDenyUpdateEntity,
      testEntity,
    );
    expectAuthorizationError(canViewerDeleteResult, {
      entityId: leafEntity.getID(),
      action: EntityAuthorizationAction.DELETE,
    });
  });

  it('denies when recursive policy denies for SET_NULL', async () => {
    const companionProvider = createUnitTestPostgresEntityCompanionProvider();
    const viewerContext = new ViewerContext(companionProvider);
    const testEntity = await SimpleTestDenyUpdateEntity.creator(viewerContext).createAsync();
    // add another entity referencing testEntity that would set null to its column when testEntity is deleted
    const leafEntity = await LeafDenyUpdateEntity.creator(viewerContext)
      .setField('simple_test_deny_update_set_null_id', testEntity.getID())
      .createAsync();
    const canViewerDelete = await canViewerDeleteAsync(SimpleTestDenyUpdateEntity, testEntity);
    expect(canViewerDelete).toBe(false);
    const canViewerDeleteResult = await getCanViewerDeleteResultAsync(
      SimpleTestDenyUpdateEntity,
      testEntity,
    );
    expectAuthorizationError(canViewerDeleteResult, {
      entityId: leafEntity.getID(),
      action: EntityAuthorizationAction.UPDATE,
    });
  });

  it('allows when recursive policy allows for CASCADE_DELETE and SET_NULL', async () => {
    const companionProvider = createUnitTestPostgresEntityCompanionProvider();
    const viewerContext = new ViewerContext(companionProvider);
    const testEntity = await SimpleTestDenyUpdateEntity.creator(viewerContext).createAsync();
    // add another entity referencing testEntity that would cascade deletion to itself when testEntity is deleted
    await LeafDenyUpdateEntity.creator(viewerContext)
      .setField('simple_test_deny_update_cascade_delete_id', testEntity.getID())
      .createAsync();
    // add another entity referencing testEntity that would set null to its column when testEntity is deleted
    await LeafDenyDeleteEntity.creator(viewerContext)
      .setField('simple_test_deny_update_set_null_id', testEntity.getID())
      .createAsync();

    const canViewerDelete = await canViewerDeleteAsync(SimpleTestDenyUpdateEntity, testEntity);
    expect(canViewerDelete).toBe(true);
    const canViewerDeleteResult = await getCanViewerDeleteResultAsync(
      SimpleTestDenyUpdateEntity,
      testEntity,
    );
    expect(canViewerDeleteResult.allowed).toBe(true);
  });

  it('rethrows non-authorization errors', async () => {
    const companionProvider = createUnitTestPostgresEntityCompanionProvider();
    const viewerContext = new ViewerContext(companionProvider);
    const testEntity = await SimpleTestThrowOtherErrorEntity.creator(viewerContext).createAsync();
    await expect(canViewerDeleteAsync(SimpleTestThrowOtherErrorEntity, testEntity)).rejects.toThrow(
      'delete error',
    );
    await expect(
      getCanViewerDeleteResultAsync(SimpleTestThrowOtherErrorEntity, testEntity),
    ).rejects.toThrow('delete error');
  });

  it('returns false when edge cannot be read', async () => {
    const companionProvider = createUnitTestPostgresEntityCompanionProvider();
    const viewerContext = new ViewerContext(companionProvider);
    const testEntity = await SimpleTestDenyUpdateEntity.creator(viewerContext).createAsync();
    const leafEntity = await LeafDenyReadEntity.creator(viewerContext)
      .setField('simple_test_id', testEntity.getID())
      .createAsync();
    const canViewerDelete = await canViewerDeleteAsync(SimpleTestDenyUpdateEntity, testEntity);
    expect(canViewerDelete).toBe(false);
    const canViewerDeleteResult = await getCanViewerDeleteResultAsync(
      SimpleTestDenyUpdateEntity,
      testEntity,
    );
    expectAuthorizationError(canViewerDeleteResult, {
      entityId: leafEntity.getID(),
      action: EntityAuthorizationAction.READ,
    });
  });

  it('rethrows non-authorization edge read errors', async () => {
    const companionProvider = createUnitTestPostgresEntityCompanionProvider();
    const viewerContext = new ViewerContext(companionProvider);
    const testEntity = await SimpleTestDenyUpdateEntity.creator(viewerContext).createAsync();
    await SimpleTestThrowOtherErrorEntity.creator(viewerContext)
      .setField('simple_test_id', testEntity.getID())
      .createAsync();
    await expect(canViewerDeleteAsync(SimpleTestDenyUpdateEntity, testEntity)).rejects.toThrow(
      'read in cascading delete error',
    );
    await expect(
      getCanViewerDeleteResultAsync(SimpleTestDenyUpdateEntity, testEntity),
    ).rejects.toThrow('read in cascading delete error');
  });

  it('supports running within a transaction', async () => {
    const companionProvider = createUnitTestPostgresEntityCompanionProvider();
    const viewerContext = new ViewerContext(companionProvider);
    const canViewerDelete = await viewerContext.runInTransactionForDatabaseAdaptorFlavorAsync(
      'postgres',
      async (queryContext) => {
        const testEntity = await SimpleTestDenyUpdateEntity.creator(
          viewerContext,
          queryContext,
        ).createAsync();
        await LeafDenyReadEntity.creator(viewerContext, queryContext)
          .setField('simple_test_id', testEntity.getID())
          .createAsync();
        // this would fail if transactions weren't supported or correctly passed through
        return await canViewerDeleteAsync(SimpleTestDenyUpdateEntity, testEntity, queryContext);
      },
    );
    expect(canViewerDelete).toBe(true);

    const canViewerDeleteResult = await viewerContext.runInTransactionForDatabaseAdaptorFlavorAsync(
      'postgres',
      async (queryContext) => {
        const testEntity = await SimpleTestDenyUpdateEntity.creator(
          viewerContext,
          queryContext,
        ).createAsync();
        await LeafDenyReadEntity.creator(viewerContext, queryContext)
          .setField('simple_test_id', testEntity.getID())
          .createAsync();
        // this would fail if transactions weren't supported or correctly passed through
        return await getCanViewerDeleteResultAsync(
          SimpleTestDenyUpdateEntity,
          testEntity,
          queryContext,
        );
      },
    );
    expect(canViewerDeleteResult.allowed).toBe(true);
  });

  it('evaluates privacy policy with synthetically nullified field for SET_NULL', async () => {
    const companionProvider = createUnitTestPostgresEntityCompanionProvider();
    const viewerContext = new ViewerContext(companionProvider);
    const testEntity = await ParentEntity.creator(viewerContext).createAsync();

    // Create a leaf entity that references the parent. This leaf entity's privacy policy
    // allows updates only when its reference field is being set to null. This tests that canViewerDeleteAsync
    // creates a synthetic entity with the field set to null when evaluating the SET_NULL case.
    await LeafConditionalUpdateEntity.creator(viewerContext)
      .setField('parent_id', testEntity.getID())
      .createAsync();

    const canViewerDelete = await canViewerDeleteAsync(ParentEntity, testEntity);
    expect(canViewerDelete).toBe(true);

    const canViewerDeleteResult = await getCanViewerDeleteResultAsync(ParentEntity, testEntity);
    expect(canViewerDeleteResult.allowed).toBe(true);
  });

  it('denies deletion when privacy policy fails with synthetically nullified field for SET_NULL', async () => {
    const companionProvider = createUnitTestPostgresEntityCompanionProvider();
    const viewerContext = new ViewerContext(companionProvider);
    const testEntity = await ParentEntity.creator(viewerContext).createAsync();

    // Create a leaf entity that references the parent. This leaf entity's privacy policy
    // denies updates when its reference field is being set to null. This tests that canViewerDeleteAsync
    // properly evaluates the synthetic entity and denies when the policy fails.
    const leafEntity = await LeafDenyUpdateWhenNullEntity.creator(viewerContext)
      .setField('parent_id', testEntity.getID())
      .createAsync();

    const canViewerDelete = await canViewerDeleteAsync(ParentEntity, testEntity);
    expect(canViewerDelete).toBe(false);

    const canViewerDeleteResult = await getCanViewerDeleteResultAsync(ParentEntity, testEntity);
    expectAuthorizationError(canViewerDeleteResult, {
      entityId: leafEntity.getID(),
      action: EntityAuthorizationAction.UPDATE,
    });
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

type ParentEntityFields = {
  id: string;
};

type LeafConditionalUpdateEntityFields = {
  id: string;
  parent_id: string | null;
};

type LeafDenyUpdateWhenNullEntityFields = {
  id: string;
  parent_id: string | null;
};

class DenyUpdateEntityPrivacyPolicy<
  TFields extends Record<'id', any>,
  TIDField extends keyof NonNullable<Pick<TFields, TSelectedFields>>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TIDField, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields,
> extends EntityPrivacyPolicy<TFields, TIDField, TViewerContext, TEntity, TSelectedFields> {
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<TFields, TIDField, TViewerContext, TEntity, TSelectedFields>(),
  ];
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<TFields, TIDField, TViewerContext, TEntity, TSelectedFields>(),
  ];
  protected override readonly updateRules = [
    new AlwaysDenyPrivacyPolicyRule<TFields, TIDField, TViewerContext, TEntity, TSelectedFields>(),
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<TFields, TIDField, TViewerContext, TEntity, TSelectedFields>(),
  ];
}

class DenyDeleteEntityPrivacyPolicy<
  TFields extends Record<'id', any>,
  TIDField extends keyof NonNullable<Pick<TFields, TSelectedFields>>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TIDField, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields,
> extends EntityPrivacyPolicy<TFields, TIDField, TViewerContext, TEntity, TSelectedFields> {
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<TFields, TIDField, TViewerContext, TEntity, TSelectedFields>(),
  ];
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<TFields, TIDField, TViewerContext, TEntity, TSelectedFields>(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<TFields, TIDField, TViewerContext, TEntity, TSelectedFields>(),
  ];
  protected override readonly deleteRules = [
    new AlwaysDenyPrivacyPolicyRule<TFields, TIDField, TViewerContext, TEntity, TSelectedFields>(),
  ];
}

class ThrowOtherErrorEntityPrivacyPolicy<
  TFields extends Record<'id', any>,
  TIDField extends keyof NonNullable<Pick<TFields, TSelectedFields>>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TIDField, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields,
> extends EntityPrivacyPolicy<TFields, TIDField, TViewerContext, TEntity, TSelectedFields> {
  protected override readonly readRules = [
    {
      async evaluateAsync(
        _viewerContext: TViewerContext,
        _queryContext: EntityQueryContext,
        evaluationContext: EntityPrivacyPolicyEvaluationContext<
          TFields,
          TIDField,
          TViewerContext,
          TEntity,
          TSelectedFields
        >,
        _entity: TEntity,
      ): Promise<RuleEvaluationResult> {
        if (evaluationContext.cascadingDeleteCause) {
          throw new Error('read in cascading delete error');
        }
        return RuleEvaluationResult.SKIP;
      },
    },
    new AlwaysAllowPrivacyPolicyRule<TFields, TIDField, TViewerContext, TEntity, TSelectedFields>(),
  ];
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<TFields, TIDField, TViewerContext, TEntity, TSelectedFields>(),
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
  TFields extends Record<'id', any>,
  TIDField extends keyof NonNullable<Pick<TFields, TSelectedFields>>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TIDField, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields,
> extends EntityPrivacyPolicy<TFields, TIDField, TViewerContext, TEntity, TSelectedFields> {
  protected override readonly readRules = [
    {
      async evaluateAsync(
        _viewerContext: TViewerContext,
        queryContext: EntityQueryContext,
        evaluationContext: EntityPrivacyPolicyEvaluationContext<
          TFields,
          TIDField,
          TViewerContext,
          TEntity,
          TSelectedFields
        >,
        _entity: TEntity,
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
    new AlwaysAllowPrivacyPolicyRule<TFields, TIDField, TViewerContext, TEntity, TSelectedFields>(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<TFields, TIDField, TViewerContext, TEntity, TSelectedFields>(),
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<TFields, TIDField, TViewerContext, TEntity, TSelectedFields>(),
  ];
}

class LeafDenyUpdateEntity extends Entity<TestLeafDenyUpdateFields, 'id', ViewerContext> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    TestLeafDenyUpdateFields,
    'id',
    ViewerContext,
    LeafDenyUpdateEntity,
    DenyUpdateEntityPrivacyPolicy<
      TestLeafDenyUpdateFields,
      'id',
      ViewerContext,
      LeafDenyUpdateEntity
    >
  > {
    return {
      entityClass: LeafDenyUpdateEntity,
      entityConfiguration: new EntityConfiguration<TestLeafDenyUpdateFields, 'id'>({
        idField: 'id',
        tableName: 'leaf_1',
        schema: {
          id: new UUIDField({
            columnName: 'custom_id',
            cache: false,
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

class LeafDenyDeleteEntity extends Entity<TestLeafDenyDeleteFields, 'id', ViewerContext> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    TestLeafDenyDeleteFields,
    'id',
    ViewerContext,
    LeafDenyDeleteEntity,
    DenyDeleteEntityPrivacyPolicy<
      TestLeafDenyDeleteFields,
      'id',
      ViewerContext,
      LeafDenyDeleteEntity
    >
  > {
    return {
      entityClass: LeafDenyDeleteEntity,
      entityConfiguration: new EntityConfiguration<TestLeafDenyDeleteFields, 'id'>({
        idField: 'id',
        tableName: 'leaf_2',
        schema: {
          id: new UUIDField({
            columnName: 'custom_id',
            cache: false,
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

class LeafDenyReadEntity extends Entity<TestLeafDenyReadFields, 'id', ViewerContext> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    TestLeafDenyReadFields,
    'id',
    ViewerContext,
    LeafDenyReadEntity,
    DenyReadEntityPrivacyPolicy<TestLeafDenyReadFields, 'id', ViewerContext, LeafDenyReadEntity>
  > {
    return {
      entityClass: LeafDenyReadEntity,
      entityConfiguration: new EntityConfiguration<TestLeafDenyReadFields, 'id'>({
        idField: 'id',
        tableName: 'leaf_4',
        inboundEdges: [],
        schema: {
          id: new UUIDField({
            columnName: 'custom_id',
            cache: false,
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

class SimpleTestDenyUpdateEntity extends Entity<TestEntityFields, 'id', ViewerContext> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    TestEntityFields,
    'id',
    ViewerContext,
    SimpleTestDenyUpdateEntity,
    DenyUpdateEntityPrivacyPolicy<TestEntityFields, 'id', ViewerContext, SimpleTestDenyUpdateEntity>
  > {
    return {
      entityClass: SimpleTestDenyUpdateEntity,
      entityConfiguration: new EntityConfiguration<TestEntityFields, 'id'>({
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
            cache: false,
          }),
        },
        databaseAdapterFlavor: 'postgres',
        cacheAdapterFlavor: 'redis',
      }),
      privacyPolicyClass: DenyUpdateEntityPrivacyPolicy,
    };
  }
}

class SimpleTestDenyDeleteEntity extends Entity<TestEntityFields, 'id', ViewerContext> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    TestEntityFields,
    'id',
    ViewerContext,
    SimpleTestDenyDeleteEntity,
    DenyDeleteEntityPrivacyPolicy<TestEntityFields, 'id', ViewerContext, SimpleTestDenyDeleteEntity>
  > {
    return {
      entityClass: SimpleTestDenyDeleteEntity,
      entityConfiguration: new EntityConfiguration<TestEntityFields, 'id'>({
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
            cache: false,
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
  'id',
  ViewerContext
> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    TestEntityThrowOtherErrorFields,
    'id',
    ViewerContext,
    SimpleTestThrowOtherErrorEntity,
    ThrowOtherErrorEntityPrivacyPolicy<
      TestEntityThrowOtherErrorFields,
      'id',
      ViewerContext,
      SimpleTestThrowOtherErrorEntity
    >
  > {
    return {
      entityClass: SimpleTestThrowOtherErrorEntity,
      entityConfiguration: new EntityConfiguration<TestEntityThrowOtherErrorFields, 'id'>({
        idField: 'id',
        tableName: 'blah_3',
        inboundEdges: [],
        schema: {
          id: new UUIDField({
            columnName: 'custom_id',
            cache: false,
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

class ConditionalUpdateEntityPrivacyPolicy extends EntityPrivacyPolicy<
  LeafConditionalUpdateEntityFields,
  'id',
  ViewerContext,
  LeafConditionalUpdateEntity
> {
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<
      LeafConditionalUpdateEntityFields,
      'id',
      ViewerContext,
      LeafConditionalUpdateEntity
    >(),
  ];
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<
      LeafConditionalUpdateEntityFields,
      'id',
      ViewerContext,
      LeafConditionalUpdateEntity
    >(),
  ];
  protected override readonly updateRules = [
    {
      async evaluateAsync(
        _viewerContext: ViewerContext,
        _queryContext: EntityQueryContext,
        evaluationContext: EntityPrivacyPolicyEvaluationContext<
          LeafConditionalUpdateEntityFields,
          'id',
          ViewerContext,
          LeafConditionalUpdateEntity
        >,
        entity: LeafConditionalUpdateEntity,
      ): Promise<RuleEvaluationResult> {
        // Only allow updates when parent_id is being set to null
        // and parent_id was previously non-null and was the cascading delete cause

        const { previousValue, cascadingDeleteCause } = evaluationContext;
        if (!previousValue || !cascadingDeleteCause) {
          return RuleEvaluationResult.SKIP;
        }

        const parentId = entity.getField('parent_id');
        const previousParentId = previousValue.getField('parent_id');

        if (parentId !== null) {
          return RuleEvaluationResult.SKIP;
        }

        if (!previousParentId) {
          return RuleEvaluationResult.SKIP;
        }

        if (cascadingDeleteCause.entity.getID() !== previousParentId) {
          return RuleEvaluationResult.SKIP;
        }

        return RuleEvaluationResult.ALLOW;
      },
    },
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<
      LeafConditionalUpdateEntityFields,
      'id',
      ViewerContext,
      LeafConditionalUpdateEntity
    >(),
  ];
}

// Privacy policy that denies updates when parent_id is null
class DenyUpdateWhenNullEntityPrivacyPolicy extends EntityPrivacyPolicy<
  LeafConditionalUpdateEntityFields,
  'id',
  ViewerContext,
  LeafConditionalUpdateEntity
> {
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<
      LeafConditionalUpdateEntityFields,
      'id',
      ViewerContext,
      LeafConditionalUpdateEntity
    >(),
  ];
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<
      LeafConditionalUpdateEntityFields,
      'id',
      ViewerContext,
      LeafConditionalUpdateEntity
    >(),
  ];
  protected override readonly updateRules = [
    {
      async evaluateAsync(
        _viewerContext: ViewerContext,
        _queryContext: EntityQueryContext,
        evaluationContext: EntityPrivacyPolicyEvaluationContext<
          LeafConditionalUpdateEntityFields,
          'id',
          ViewerContext,
          LeafConditionalUpdateEntity
        >,
        entity: LeafConditionalUpdateEntity,
      ): Promise<RuleEvaluationResult> {
        // Deny updates when parent_id is being set to null

        const { previousValue } = evaluationContext;
        if (!previousValue) {
          return RuleEvaluationResult.SKIP;
        }

        const parentId = entity.getField('parent_id');
        const previousParentId = previousValue.getField('parent_id');

        if (!parentId && previousParentId) {
          return RuleEvaluationResult.DENY;
        }

        return RuleEvaluationResult.SKIP;
      },
    },
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<
      LeafConditionalUpdateEntityFields,
      'id',
      ViewerContext,
      LeafConditionalUpdateEntity
    >(),
  ];
}

class ParentEntity extends Entity<ParentEntityFields, 'id', ViewerContext> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    ParentEntityFields,
    'id',
    ViewerContext,
    ParentEntity,
    DenyUpdateEntityPrivacyPolicy<ParentEntityFields, 'id', ViewerContext, ParentEntity>
  > {
    return {
      entityClass: ParentEntity,
      entityConfiguration: new EntityConfiguration<ParentEntityFields, 'id'>({
        idField: 'id',
        tableName: 'parent_entity',
        inboundEdges: [LeafConditionalUpdateEntity, LeafDenyUpdateWhenNullEntity],
        schema: {
          id: new UUIDField({
            columnName: 'id',
            cache: false,
          }),
        },
        databaseAdapterFlavor: 'postgres',
        cacheAdapterFlavor: 'redis',
      }),
      privacyPolicyClass: DenyUpdateEntityPrivacyPolicy,
    };
  }
}

class LeafConditionalUpdateEntity extends Entity<
  LeafConditionalUpdateEntityFields,
  'id',
  ViewerContext
> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    LeafConditionalUpdateEntityFields,
    'id',
    ViewerContext,
    LeafConditionalUpdateEntity,
    ConditionalUpdateEntityPrivacyPolicy
  > {
    return {
      entityClass: LeafConditionalUpdateEntity,
      entityConfiguration: new EntityConfiguration<LeafConditionalUpdateEntityFields, 'id'>({
        idField: 'id',
        tableName: 'leaf_conditional_update',
        schema: {
          id: new UUIDField({
            columnName: 'id',
            cache: false,
          }),
          parent_id: new UUIDField({
            columnName: 'parent_id',
            association: {
              associatedEntityClass: ParentEntity,
              edgeDeletionBehavior: EntityEdgeDeletionBehavior.SET_NULL,
            },
          }),
        },
        databaseAdapterFlavor: 'postgres',
        cacheAdapterFlavor: 'redis',
      }),
      privacyPolicyClass: ConditionalUpdateEntityPrivacyPolicy,
    };
  }
}

class LeafDenyUpdateWhenNullEntity extends Entity<
  LeafDenyUpdateWhenNullEntityFields,
  'id',
  ViewerContext
> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    LeafDenyUpdateWhenNullEntityFields,
    'id',
    ViewerContext,
    LeafDenyUpdateWhenNullEntity,
    DenyUpdateWhenNullEntityPrivacyPolicy
  > {
    return {
      entityClass: LeafDenyUpdateWhenNullEntity,
      entityConfiguration: new EntityConfiguration<LeafDenyUpdateWhenNullEntityFields, 'id'>({
        idField: 'id',
        tableName: 'leaf_deny_update_when_null',
        schema: {
          id: new UUIDField({
            columnName: 'id',
            cache: false,
          }),
          parent_id: new UUIDField({
            columnName: 'parent_id',
            association: {
              associatedEntityClass: ParentEntity,
              edgeDeletionBehavior: EntityEdgeDeletionBehavior.SET_NULL,
            },
          }),
        },
        databaseAdapterFlavor: 'postgres',
        cacheAdapterFlavor: 'redis',
      }),
      privacyPolicyClass: DenyUpdateWhenNullEntityPrivacyPolicy,
    };
  }
}

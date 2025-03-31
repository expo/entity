import invariant from 'invariant';

import Entity from '../Entity';
import { EntityCompanionDefinition } from '../EntityCompanionProvider';
import EntityConfiguration from '../EntityConfiguration';
import { EntityEdgeDeletionBehavior } from '../EntityFieldDefinition';
import { UUIDField } from '../EntityFields';
import { EntityTriggerMutationInfo, EntityMutationType } from '../EntityMutationInfo';
import { EntityMutationTrigger } from '../EntityMutationTriggerConfiguration';
import EntityPrivacyPolicy, {
  EntityPrivacyPolicyEvaluationContext,
  EntityAuthorizationAction,
} from '../EntityPrivacyPolicy';
import { EntityTransactionalQueryContext, EntityQueryContext } from '../EntityQueryContext';
import { CacheStatus } from '../internal/ReadThroughEntityCache';
import { SingleFieldHolder, SingleFieldValueHolder } from '../internal/SingleFieldHolder';
import PrivacyPolicyRule, { RuleEvaluationResult } from '../rules/PrivacyPolicyRule';
import TestViewerContext from '../testfixtures/TestViewerContext';
import { InMemoryFullCacheStubCacheAdapter } from '../utils/testing/StubCacheAdapter';
import { createUnitTestEntityCompanionProvider } from '../utils/testing/createUnitTestEntityCompanionProvider';

interface OtherFields {
  id: string;
}

interface ParentFields {
  id: string;
}

interface ChildFields {
  id: string;
  unused_other_edge_id: string | null;
  parent_id: string;
}

interface GrandChildFields {
  id: string;
  parent_id: string;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const makeEntityClasses = (edgeDeletionBehavior: EntityEdgeDeletionBehavior) => {
  const triggerExecutionCounts = {
    ParentEntityDeletion: 0,
    ChildEntityDeletion: 0,
    GrandChildEntityDeletion: 0,

    ParentEntityUpdate: 0,
    ChildEntityUpdate: 0,
    GrandChildEntityUpdate: 0,
  };

  const privacyPolicyEvaluationRecords = {
    shouldRecord: false,
    ParentEntity: {
      [EntityAuthorizationAction.CREATE]: [],
      [EntityAuthorizationAction.READ]: [],
      [EntityAuthorizationAction.UPDATE]: [],
      [EntityAuthorizationAction.DELETE]: [],
    },
    ChildEntity: {
      [EntityAuthorizationAction.CREATE]: [],
      [EntityAuthorizationAction.READ]: [],
      [EntityAuthorizationAction.UPDATE]: [],
      [EntityAuthorizationAction.DELETE]: [],
    },
    GrandChildEntity: {
      [EntityAuthorizationAction.CREATE]: [],
      [EntityAuthorizationAction.READ]: [],
      [EntityAuthorizationAction.UPDATE]: [],
      [EntityAuthorizationAction.DELETE]: [],
    },
  };

  class AlwaysAllowPrivacyPolicyRuleThatRecords extends PrivacyPolicyRule<
    any,
    'id',
    TestViewerContext,
    any,
    any
  > {
    constructor(private readonly action: EntityAuthorizationAction) {
      super();
    }

    async evaluateAsync(
      _viewerContext: TestViewerContext,
      _queryContext: EntityQueryContext,
      evaluationContext: EntityPrivacyPolicyEvaluationContext<
        any,
        'id',
        TestViewerContext,
        any,
        any
      >,
      entity: any,
    ): Promise<RuleEvaluationResult> {
      if (privacyPolicyEvaluationRecords.shouldRecord) {
        (privacyPolicyEvaluationRecords as any)[entity.constructor.name][this.action].push(
          evaluationContext,
        );
      }
      return RuleEvaluationResult.ALLOW;
    }
  }

  class TestEntityPrivacyPolicy extends EntityPrivacyPolicy<
    any,
    'id',
    TestViewerContext,
    any,
    any
  > {
    protected override readonly readRules = [
      new AlwaysAllowPrivacyPolicyRuleThatRecords(EntityAuthorizationAction.READ),
    ];
    protected override readonly createRules = [
      new AlwaysAllowPrivacyPolicyRuleThatRecords(EntityAuthorizationAction.CREATE),
    ];
    protected override readonly updateRules = [
      new AlwaysAllowPrivacyPolicyRuleThatRecords(EntityAuthorizationAction.UPDATE),
    ];
    protected override readonly deleteRules = [
      new AlwaysAllowPrivacyPolicyRuleThatRecords(EntityAuthorizationAction.DELETE),
    ];
  }

  class ParentCheckInfoDeletionTrigger extends EntityMutationTrigger<
    ParentFields,
    'id',
    TestViewerContext,
    ParentEntity
  > {
    async executeAsync(
      _viewerContext: TestViewerContext,
      _queryContext: EntityTransactionalQueryContext,
      _entity: ParentEntity,
      mutationInfo: EntityTriggerMutationInfo<ParentFields, 'id', TestViewerContext, ParentEntity>,
    ): Promise<void> {
      invariant(mutationInfo.type === EntityMutationType.DELETE, 'invalid EntityMutationType');
      if (mutationInfo.cascadingDeleteCause !== null) {
        throw new Error('Parent entity should not have casade delete cause');
      }

      triggerExecutionCounts.ParentEntityDeletion++;
    }
  }

  class ParentCheckInfoUpdateTrigger extends EntityMutationTrigger<
    ParentFields,
    'id',
    TestViewerContext,
    ParentEntity
  > {
    async executeAsync(
      _viewerContext: TestViewerContext,
      _queryContext: EntityTransactionalQueryContext,
      _entity: ParentEntity,
      mutationInfo: EntityTriggerMutationInfo<ParentFields, 'id', TestViewerContext, ParentEntity>,
    ): Promise<void> {
      invariant(mutationInfo.type === EntityMutationType.UPDATE, 'invalid EntityMutationType');
      if (mutationInfo.cascadingDeleteCause !== null) {
        throw new Error('Parent entity should not have casade delete cause');
      }

      triggerExecutionCounts.ParentEntityUpdate++;
    }
  }

  class ChildCheckInfoDeletionTrigger extends EntityMutationTrigger<
    ChildFields,
    'id',
    TestViewerContext,
    ChildEntity
  > {
    async executeAsync(
      _viewerContext: TestViewerContext,
      _queryContext: EntityTransactionalQueryContext,
      _entity: ChildEntity,
      mutationInfo: EntityTriggerMutationInfo<ChildFields, 'id', TestViewerContext, ChildEntity>,
    ): Promise<void> {
      invariant(mutationInfo.type === EntityMutationType.DELETE, 'invalid EntityMutationType');
      if (mutationInfo.cascadingDeleteCause === null) {
        throw new Error('Child entity should have casade delete cause');
      }

      const cascadingDeleteCauseEntity = mutationInfo.cascadingDeleteCause.entity;
      if (!(cascadingDeleteCauseEntity instanceof ParentEntity)) {
        throw new Error('Child entity should have casade delete cause entity of type ParentEntity');
      }

      const secondLevelCascadingDeleteCause =
        mutationInfo.cascadingDeleteCause.cascadingDeleteCause;
      if (secondLevelCascadingDeleteCause) {
        throw new Error('Child entity should not have two-level casade delete cause');
      }

      triggerExecutionCounts.ChildEntityDeletion++;
    }
  }

  class ChildCheckInfoUpdateTrigger extends EntityMutationTrigger<
    ChildFields,
    'id',
    TestViewerContext,
    ChildEntity
  > {
    async executeAsync(
      _viewerContext: TestViewerContext,
      _queryContext: EntityTransactionalQueryContext,
      _entity: ChildEntity,
      mutationInfo: EntityTriggerMutationInfo<ChildFields, 'id', TestViewerContext, ChildEntity>,
    ): Promise<void> {
      invariant(mutationInfo.type === EntityMutationType.UPDATE, 'invalid EntityMutationType');
      if (mutationInfo.cascadingDeleteCause === null) {
        throw new Error('Child entity should have casade delete cause');
      }

      const cascadingDeleteCauseEntity = mutationInfo.cascadingDeleteCause.entity;
      if (!(cascadingDeleteCauseEntity instanceof ParentEntity)) {
        throw new Error('Child entity should have casade delete cause entity of type ParentEntity');
      }

      const secondLevelCascadingDeleteCause =
        mutationInfo.cascadingDeleteCause.cascadingDeleteCause;
      if (secondLevelCascadingDeleteCause) {
        throw new Error('Child entity should not have two-level casade delete cause');
      }

      triggerExecutionCounts.ChildEntityUpdate++;
    }
  }

  class GrandChildCheckInfoDeletionTrigger extends EntityMutationTrigger<
    GrandChildFields,
    'id',
    TestViewerContext,
    GrandChildEntity
  > {
    async executeAsync(
      _viewerContext: TestViewerContext,
      _queryContext: EntityTransactionalQueryContext,
      _entity: GrandChildEntity,
      mutationInfo: EntityTriggerMutationInfo<
        GrandChildFields,
        'id',
        TestViewerContext,
        GrandChildEntity
      >,
    ): Promise<void> {
      invariant(mutationInfo.type === EntityMutationType.DELETE, 'invalid EntityMutationType');
      if (mutationInfo.cascadingDeleteCause === null) {
        throw new Error('GrandChild entity should have cascade delete cause');
      }

      const cascadingDeleteCauseEntity = mutationInfo.cascadingDeleteCause.entity;
      if (!(cascadingDeleteCauseEntity instanceof ChildEntity)) {
        throw new Error(
          'GrandChild entity should have cascade delete cause entity of type ChildEntity',
        );
      }

      const secondLevelCascadingDeleteCause =
        mutationInfo.cascadingDeleteCause.cascadingDeleteCause;
      if (!secondLevelCascadingDeleteCause) {
        throw new Error('GrandChild entity should have two-level casade delete cause');
      }

      const secondLevelCascadingDeleteCauseEntity = secondLevelCascadingDeleteCause.entity;
      if (!(secondLevelCascadingDeleteCauseEntity instanceof ParentEntity)) {
        throw new Error(
          'GrandChild entity should have second level casade delete cause entity of type ParentEntity',
        );
      }

      const thirdLevelCascadingDeleteCause = secondLevelCascadingDeleteCause.cascadingDeleteCause;
      if (thirdLevelCascadingDeleteCause) {
        throw new Error('GrandChild entity should not have three-level casade delete cause');
      }

      triggerExecutionCounts.GrandChildEntityDeletion++;
    }
  }

  class GrandChildCheckInfoUpdateTrigger extends EntityMutationTrigger<
    GrandChildFields,
    'id',
    TestViewerContext,
    GrandChildEntity
  > {
    async executeAsync(
      _viewerContext: TestViewerContext,
      _queryContext: EntityTransactionalQueryContext,
      _entity: GrandChildEntity,
      mutationInfo: EntityTriggerMutationInfo<
        GrandChildFields,
        'id',
        TestViewerContext,
        GrandChildEntity
      >,
    ): Promise<void> {
      invariant(mutationInfo.type === EntityMutationType.UPDATE, 'invalid EntityMutationType');
      if (mutationInfo.cascadingDeleteCause === null) {
        throw new Error('GrandChild entity should have cascade delete cause');
      }

      const cascadingDeleteCauseEntity = mutationInfo.cascadingDeleteCause.entity;
      if (!(cascadingDeleteCauseEntity instanceof ChildEntity)) {
        throw new Error(
          'GrandChild entity should have cascade delete cause entity of type ChildEntity',
        );
      }

      const secondLevelCascadingDeleteCause =
        mutationInfo.cascadingDeleteCause.cascadingDeleteCause;
      if (!secondLevelCascadingDeleteCause) {
        throw new Error('GrandChild entity should have two-level casade delete cause');
      }

      const secondLevelCascadingDeleteCauseEntity = secondLevelCascadingDeleteCause.entity;
      if (!(secondLevelCascadingDeleteCauseEntity instanceof ParentEntity)) {
        throw new Error(
          'GrandChild entity should have second level casade delete cause entity of type ParentEntity',
        );
      }

      const thirdLevelCascadingDeleteCause = secondLevelCascadingDeleteCause.cascadingDeleteCause;
      if (thirdLevelCascadingDeleteCause) {
        throw new Error('GrandChild entity should not have three-level casade delete cause');
      }

      triggerExecutionCounts.GrandChildEntityUpdate++;
    }
  }

  class OtherEntity extends Entity<OtherFields, 'id', TestViewerContext> {
    static defineCompanionDefinition(): EntityCompanionDefinition<
      OtherFields,
      'id',
      TestViewerContext,
      OtherEntity,
      TestEntityPrivacyPolicy
    > {
      return {
        entityClass: ParentEntity,
        entityConfiguration: otherEntityConfiguration,
        privacyPolicyClass: TestEntityPrivacyPolicy,
      };
    }
  }

  class ParentEntity extends Entity<ParentFields, 'id', TestViewerContext> {
    static defineCompanionDefinition(): EntityCompanionDefinition<
      ParentFields,
      'id',
      TestViewerContext,
      ParentEntity,
      TestEntityPrivacyPolicy
    > {
      return {
        entityClass: ParentEntity,
        entityConfiguration: parentEntityConfiguration,
        privacyPolicyClass: TestEntityPrivacyPolicy,
        mutationTriggers: {
          beforeDelete: [new ParentCheckInfoDeletionTrigger()],
          afterDelete: [new ParentCheckInfoDeletionTrigger()],

          beforeUpdate: [new ParentCheckInfoUpdateTrigger()],
          afterUpdate: [new ParentCheckInfoUpdateTrigger()],
        },
      };
    }
  }

  class ChildEntity extends Entity<ChildFields, 'id', TestViewerContext> {
    static defineCompanionDefinition(): EntityCompanionDefinition<
      ChildFields,
      'id',
      TestViewerContext,
      ChildEntity,
      TestEntityPrivacyPolicy
    > {
      return {
        entityClass: ChildEntity,
        entityConfiguration: childEntityConfiguration,
        privacyPolicyClass: TestEntityPrivacyPolicy,
        mutationTriggers: {
          beforeDelete: [new ChildCheckInfoDeletionTrigger()],
          afterDelete: [new ChildCheckInfoDeletionTrigger()],

          beforeUpdate: [new ChildCheckInfoUpdateTrigger()],
          afterUpdate: [new ChildCheckInfoUpdateTrigger()],
        },
      };
    }
  }

  class GrandChildEntity extends Entity<GrandChildFields, 'id', TestViewerContext> {
    static defineCompanionDefinition(): EntityCompanionDefinition<
      GrandChildFields,
      'id',
      TestViewerContext,
      GrandChildEntity,
      TestEntityPrivacyPolicy
    > {
      return {
        entityClass: GrandChildEntity,
        entityConfiguration: grandChildEntityConfiguration,
        privacyPolicyClass: TestEntityPrivacyPolicy,
        mutationTriggers: {
          beforeDelete: [new GrandChildCheckInfoDeletionTrigger()],
          afterDelete: [new GrandChildCheckInfoDeletionTrigger()],

          beforeUpdate: [new GrandChildCheckInfoUpdateTrigger()],
          afterUpdate: [new GrandChildCheckInfoUpdateTrigger()],
        },
      };
    }
  }

  const otherEntityConfiguration = new EntityConfiguration<OtherFields, 'id'>({
    idField: 'id',
    tableName: 'others',
    schema: {
      id: new UUIDField({
        columnName: 'id',
        cache: true,
      }),
    },
    databaseAdapterFlavor: 'postgres',
    cacheAdapterFlavor: 'redis',
  });

  const parentEntityConfiguration = new EntityConfiguration<ParentFields, 'id'>({
    idField: 'id',
    tableName: 'parents',
    inboundEdges: [ChildEntity],
    schema: {
      id: new UUIDField({
        columnName: 'id',
        cache: true,
      }),
    },
    databaseAdapterFlavor: 'postgres',
    cacheAdapterFlavor: 'redis',
  });

  const childEntityConfiguration = new EntityConfiguration<ChildFields, 'id'>({
    idField: 'id',
    tableName: 'children',
    inboundEdges: [GrandChildEntity],
    schema: {
      id: new UUIDField({
        columnName: 'id',
        cache: true,
      }),
      unused_other_edge_id: new UUIDField({
        columnName: 'unused_other_edge_id',
        association: {
          associatedEntityClass: OtherEntity,
          edgeDeletionBehavior,
        },
      }),
      parent_id: new UUIDField({
        columnName: 'parent_id',
        cache: true,
        association: {
          associatedEntityClass: ParentEntity,
          associatedEntityLookupByField: 'id', // sanity check that this functionality works by using it for one edge
          edgeDeletionBehavior,
        },
      }),
    },
    databaseAdapterFlavor: 'postgres',
    cacheAdapterFlavor: 'redis',
  });

  const grandChildEntityConfiguration = new EntityConfiguration<GrandChildFields, 'id'>({
    idField: 'id',
    tableName: 'grandchildren',
    schema: {
      id: new UUIDField({
        columnName: 'id',
        cache: true,
      }),
      parent_id: new UUIDField({
        columnName: 'parent_id',
        cache: true,
        association: {
          associatedEntityClass: ChildEntity,
          edgeDeletionBehavior,
        },
      }),
    },
    databaseAdapterFlavor: 'postgres',
    cacheAdapterFlavor: 'redis',
  });

  return {
    ParentEntity,
    ChildEntity,
    GrandChildEntity,
    triggerExecutionCounts,
    privacyPolicyEvaluationRecords,
  };
};

describe('EntityMutator.processEntityDeletionForInboundEdgesAsync', () => {
  describe('EntityEdgeDeletionBehavior.CASCADE_DELETE', () => {
    it('deletes', async () => {
      const {
        ParentEntity,
        ChildEntity,
        GrandChildEntity,
        triggerExecutionCounts,
        privacyPolicyEvaluationRecords,
      } = makeEntityClasses(EntityEdgeDeletionBehavior.CASCADE_DELETE);
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new TestViewerContext(companionProvider);

      const parent = await ParentEntity.creator(viewerContext).createAsync();
      const child = await ChildEntity.creator(viewerContext)
        .setField('parent_id', parent.getID())
        .createAsync();
      const grandchild = await GrandChildEntity.creator(viewerContext)
        .setField('parent_id', child.getID())
        .createAsync();

      await expect(
        ParentEntity.loader(viewerContext).loadByIDNullableAsync(parent.getID()),
      ).resolves.not.toBeNull();
      await expect(
        ChildEntity.loader(viewerContext).loadByIDNullableAsync(child.getID()),
      ).resolves.not.toBeNull();
      await expect(
        GrandChildEntity.loader(viewerContext).loadByIDNullableAsync(grandchild.getID()),
      ).resolves.not.toBeNull();

      privacyPolicyEvaluationRecords.shouldRecord = true;
      await ParentEntity.deleter(parent).deleteAsync();
      privacyPolicyEvaluationRecords.shouldRecord = false;

      await expect(
        ParentEntity.loader(viewerContext).loadByIDNullableAsync(parent.getID()),
      ).resolves.toBeNull();
      await expect(
        ChildEntity.loader(viewerContext).loadByIDNullableAsync(child.getID()),
      ).resolves.toBeNull();
      await expect(
        GrandChildEntity.loader(viewerContext).loadByIDNullableAsync(grandchild.getID()),
      ).resolves.toBeNull();

      // two calls for each trigger, one beforeDelete, one afterDelete
      expect(triggerExecutionCounts).toMatchObject({
        ParentEntityDeletion: 2,
        ChildEntityDeletion: 2,
        GrandChildEntityDeletion: 2,

        ParentEntityUpdate: 0,
        ChildEntityUpdate: 0,
        GrandChildEntityUpdate: 0,
      });

      expect(privacyPolicyEvaluationRecords).toMatchObject({
        ParentEntity: {
          [EntityAuthorizationAction.CREATE]: [],
          [EntityAuthorizationAction.READ]: [],
          [EntityAuthorizationAction.UPDATE]: [],
          // one DELETE auth action for parent (since it's being deleted)
          [EntityAuthorizationAction.DELETE]: [{ cascadingDeleteCause: null }],
        },
        ChildEntity: {
          [EntityAuthorizationAction.CREATE]: [],
          // one READ auth action for child in order to delete via cascade
          [EntityAuthorizationAction.READ]: [
            {
              cascadingDeleteCause: {
                entity: expect.any(ParentEntity),
                cascadingDeleteCause: null,
              },
            },
          ],
          [EntityAuthorizationAction.UPDATE]: [],
          // one DELETE auth action for child (since it's being deleted via cascade)
          [EntityAuthorizationAction.DELETE]: [
            {
              cascadingDeleteCause: {
                entity: expect.any(ParentEntity),
                cascadingDeleteCause: null,
              },
            },
          ],
        },
        GrandChildEntity: {
          [EntityAuthorizationAction.CREATE]: [],
          // one READ auth action for grandchild in order to delete via cascade
          [EntityAuthorizationAction.READ]: [
            {
              cascadingDeleteCause: {
                entity: expect.any(ChildEntity),
                cascadingDeleteCause: {
                  entity: expect.any(ParentEntity),
                  cascadingDeleteCause: null,
                },
              },
            },
          ],
          [EntityAuthorizationAction.UPDATE]: [],
          // one DELETE auth action for grandchild (since it's being deleted via cascade)
          [EntityAuthorizationAction.DELETE]: [
            {
              cascadingDeleteCause: {
                entity: expect.any(ChildEntity),
                cascadingDeleteCause: {
                  entity: expect.any(ParentEntity),
                  cascadingDeleteCause: null,
                },
              },
            },
          ],
        },
      });
    });
  });

  describe('EntityEdgeDeletionBehavior.SET_NULL', () => {
    it('sets null', async () => {
      const {
        ParentEntity,
        ChildEntity,
        GrandChildEntity,
        triggerExecutionCounts,
        privacyPolicyEvaluationRecords,
      } = makeEntityClasses(EntityEdgeDeletionBehavior.SET_NULL);

      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new TestViewerContext(companionProvider);

      const parent = await ParentEntity.creator(viewerContext).createAsync();
      const child = await ChildEntity.creator(viewerContext)
        .setField('parent_id', parent.getID())
        .createAsync();
      const grandchild = await GrandChildEntity.creator(viewerContext)
        .setField('parent_id', child.getID())
        .createAsync();

      await expect(
        ParentEntity.loader(viewerContext).loadByIDNullableAsync(parent.getID()),
      ).resolves.not.toBeNull();
      await expect(
        ChildEntity.loader(viewerContext).loadByIDNullableAsync(child.getID()),
      ).resolves.not.toBeNull();
      await expect(
        GrandChildEntity.loader(viewerContext).loadByIDNullableAsync(grandchild.getID()),
      ).resolves.not.toBeNull();

      privacyPolicyEvaluationRecords.shouldRecord = true;
      await ParentEntity.deleter(parent).deleteAsync();
      privacyPolicyEvaluationRecords.shouldRecord = false;

      await expect(
        ParentEntity.loader(viewerContext).loadByIDNullableAsync(parent.getID()),
      ).resolves.toBeNull();

      const loadedChild = await ChildEntity.loader(viewerContext).loadByIDAsync(child.getID());
      expect(loadedChild.getField('parent_id')).toBeNull();

      const loadedGrandchild = await GrandChildEntity.loader(viewerContext).loadByIDAsync(
        grandchild.getID(),
      );
      expect(loadedGrandchild.getField('parent_id')).toEqual(loadedChild.getID());

      // two calls for only parent trigger, one beforeDelete, one afterDelete
      // when using set null the descendants aren't deleted
      expect(triggerExecutionCounts).toMatchObject({
        ParentEntityDeletion: 2,
        ChildEntityDeletion: 0,
        GrandChildEntityDeletion: 0,

        ParentEntityUpdate: 0,
        ChildEntityUpdate: 2,
        GrandChildEntityUpdate: 0,
      });

      expect(privacyPolicyEvaluationRecords).toMatchObject({
        ParentEntity: {
          [EntityAuthorizationAction.CREATE]: [],
          [EntityAuthorizationAction.READ]: [],
          [EntityAuthorizationAction.UPDATE]: [],
          // one DELETE auth action for parent (since it's being deleted)
          [EntityAuthorizationAction.DELETE]: [{ cascadingDeleteCause: null }],
        },
        ChildEntity: {
          [EntityAuthorizationAction.CREATE]: [],

          // two READs auth action for Child during parent deletion:
          // 1. Read to initiate the SET_NULL (to update the entity)
          // 1. Read automatically post-update
          // no other entities are read since it is not cascaded past first entity
          [EntityAuthorizationAction.READ]: [
            {
              cascadingDeleteCause: {
                entity: expect.any(ParentEntity),
                cascadingDeleteCause: null,
              },
            },
            {
              cascadingDeleteCause: {
                entity: expect.any(ParentEntity),
                cascadingDeleteCause: null,
              },
            },
          ],
          // one UPDATE to set null
          [EntityAuthorizationAction.UPDATE]: [
            {
              cascadingDeleteCause: {
                entity: expect.any(ParentEntity),
                cascadingDeleteCause: null,
              },
            },
          ],
          [EntityAuthorizationAction.DELETE]: [],
        },
        GrandChildEntity: {
          [EntityAuthorizationAction.CREATE]: [],
          [EntityAuthorizationAction.READ]: [],
          [EntityAuthorizationAction.UPDATE]: [],
          [EntityAuthorizationAction.DELETE]: [],
        },
      });
    });
  });

  describe('EntityEdgeDeletionBehavior.SET_NULL_INVALIDATE_CACHE_ONLY', () => {
    it('invalidates the cache', async () => {
      const {
        ParentEntity,
        ChildEntity,
        GrandChildEntity,
        triggerExecutionCounts,
        privacyPolicyEvaluationRecords,
      } = makeEntityClasses(EntityEdgeDeletionBehavior.SET_NULL_INVALIDATE_CACHE_ONLY);

      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new TestViewerContext(companionProvider);

      const parent = await ParentEntity.creator(viewerContext).createAsync();
      const child = await ChildEntity.creator(viewerContext)
        .setField('parent_id', parent.getID())
        .createAsync();
      const grandchild = await GrandChildEntity.creator(viewerContext)
        .setField('parent_id', child.getID())
        .createAsync();

      await expect(
        ParentEntity.loader(viewerContext).loadByIDNullableAsync(parent.getID()),
      ).resolves.not.toBeNull();
      await expect(
        ChildEntity.loader(viewerContext).loadByFieldEqualingAsync('parent_id', parent.getID()),
      ).resolves.not.toBeNull();
      await expect(
        GrandChildEntity.loader(viewerContext).loadByFieldEqualingAsync('parent_id', child.getID()),
      ).resolves.not.toBeNull();

      const childCacheAdapter = viewerContext.getViewerScopedEntityCompanionForClass(ChildEntity)[
        'entityCompanion'
      ]['tableDataCoordinator']['cacheAdapter'] as InMemoryFullCacheStubCacheAdapter<
        ChildFields,
        'id'
      >;
      const childCachedBefore = await childCacheAdapter.loadManyAsync(
        new SingleFieldHolder('parent_id'),
        [new SingleFieldValueHolder(parent.getID())],
      );
      expect(childCachedBefore.get(new SingleFieldValueHolder(parent.getID()))?.status).toEqual(
        CacheStatus.HIT,
      );

      const grandChildCacheAdapter = viewerContext.getViewerScopedEntityCompanionForClass(
        GrandChildEntity,
      )['entityCompanion']['tableDataCoordinator'][
        'cacheAdapter'
      ] as InMemoryFullCacheStubCacheAdapter<ChildFields, 'id'>;
      const grandChildCachedBefore = await grandChildCacheAdapter.loadManyAsync(
        new SingleFieldHolder('parent_id'),
        [new SingleFieldValueHolder(child.getID())],
      );
      expect(grandChildCachedBefore.get(new SingleFieldValueHolder(child.getID()))?.status).toEqual(
        CacheStatus.HIT,
      );

      privacyPolicyEvaluationRecords.shouldRecord = true;
      await ParentEntity.deleter(parent).deleteAsync();
      privacyPolicyEvaluationRecords.shouldRecord = false;

      const childCachedAfter = await childCacheAdapter.loadManyAsync(
        new SingleFieldHolder('parent_id'),
        [new SingleFieldValueHolder(parent.getID())],
      );
      expect(childCachedAfter.get(new SingleFieldValueHolder(parent.getID()))?.status).toEqual(
        CacheStatus.MISS,
      );

      const grandChildCachedAfter = await grandChildCacheAdapter.loadManyAsync(
        new SingleFieldHolder('parent_id'),
        [new SingleFieldValueHolder(child.getID())],
      );
      expect(grandChildCachedAfter.get(new SingleFieldValueHolder(child.getID()))?.status).toEqual(
        CacheStatus.HIT,
      );

      await expect(
        ParentEntity.loader(viewerContext).loadByIDNullableAsync(parent.getID()),
      ).resolves.toBeNull();

      const loadedChild = await ChildEntity.loader(viewerContext).loadByIDAsync(child.getID());
      expect(loadedChild).not.toBeNull();

      const loadedGrandchild = await GrandChildEntity.loader(viewerContext).loadByIDAsync(
        grandchild.getID(),
      );
      expect(loadedGrandchild.getField('parent_id')).toEqual(loadedChild.getID());

      // two calls for only parent trigger, one beforeDelete, one afterDelete
      // when using set null the descendants aren't deleted
      expect(triggerExecutionCounts).toMatchObject({
        ParentEntityDeletion: 2,
        ChildEntityDeletion: 0,
        GrandChildEntityDeletion: 0,

        ParentEntityUpdate: 0,
        ChildEntityUpdate: 2,
        GrandChildEntityUpdate: 0,
      });

      expect(privacyPolicyEvaluationRecords).toMatchObject({
        ParentEntity: {
          [EntityAuthorizationAction.CREATE]: [],
          [EntityAuthorizationAction.READ]: [],
          [EntityAuthorizationAction.UPDATE]: [],
          // one DELETE auth action for parent (since it's being deleted)
          [EntityAuthorizationAction.DELETE]: [{ cascadingDeleteCause: null }],
        },
        ChildEntity: {
          [EntityAuthorizationAction.CREATE]: [],

          // two READs auth action for child in order to update via cascade
          // no other entities are read since it is not cascaded past first entity
          [EntityAuthorizationAction.READ]: [
            {
              cascadingDeleteCause: {
                entity: expect.any(ParentEntity),
                cascadingDeleteCause: null,
              },
            },
            {
              cascadingDeleteCause: {
                entity: expect.any(ParentEntity),
                cascadingDeleteCause: null,
              },
            },
          ],
          // one UPDATE to set null
          [EntityAuthorizationAction.UPDATE]: [
            {
              cascadingDeleteCause: {
                entity: expect.any(ParentEntity),
                cascadingDeleteCause: null,
              },
            },
          ],
          [EntityAuthorizationAction.DELETE]: [],
        },
        GrandChildEntity: {
          [EntityAuthorizationAction.CREATE]: [],
          [EntityAuthorizationAction.READ]: [],
          [EntityAuthorizationAction.UPDATE]: [],
          [EntityAuthorizationAction.DELETE]: [],
        },
      });
    });
  });

  describe('EntityEdgeDeletionBehavior.CASCADE_DELETE_INVALIDATE_CACHE_ONLY', () => {
    it('invalidates the cache', async () => {
      const {
        ParentEntity,
        ChildEntity,
        GrandChildEntity,
        triggerExecutionCounts,
        privacyPolicyEvaluationRecords,
      } = makeEntityClasses(EntityEdgeDeletionBehavior.CASCADE_DELETE_INVALIDATE_CACHE_ONLY);

      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new TestViewerContext(companionProvider);

      const parent = await ParentEntity.creator(viewerContext).createAsync();
      const child = await ChildEntity.creator(viewerContext)
        .setField('parent_id', parent.getID())
        .createAsync();
      const grandchild = await GrandChildEntity.creator(viewerContext)
        .setField('parent_id', child.getID())
        .createAsync();

      await expect(
        ParentEntity.loader(viewerContext).loadByIDNullableAsync(parent.getID()),
      ).resolves.not.toBeNull();
      await expect(
        ChildEntity.loader(viewerContext).loadByFieldEqualingAsync('parent_id', parent.getID()),
      ).resolves.not.toBeNull();
      await expect(
        GrandChildEntity.loader(viewerContext).loadByFieldEqualingAsync('parent_id', child.getID()),
      ).resolves.not.toBeNull();

      const childCacheAdapter = viewerContext.getViewerScopedEntityCompanionForClass(ChildEntity)[
        'entityCompanion'
      ]['tableDataCoordinator']['cacheAdapter'] as InMemoryFullCacheStubCacheAdapter<
        ChildFields,
        'id'
      >;
      const childCachedBefore = await childCacheAdapter.loadManyAsync(
        new SingleFieldHolder('parent_id'),
        [new SingleFieldValueHolder(parent.getID())],
      );
      expect(childCachedBefore.get(new SingleFieldValueHolder(parent.getID()))?.status).toEqual(
        CacheStatus.HIT,
      );

      const grandChildCacheAdapter = viewerContext.getViewerScopedEntityCompanionForClass(
        GrandChildEntity,
      )['entityCompanion']['tableDataCoordinator'][
        'cacheAdapter'
      ] as InMemoryFullCacheStubCacheAdapter<ChildFields, 'id'>;
      const grandChildCachedBefore = await grandChildCacheAdapter.loadManyAsync(
        new SingleFieldHolder('parent_id'),
        [new SingleFieldValueHolder(child.getID())],
      );
      expect(grandChildCachedBefore.get(new SingleFieldValueHolder(child.getID()))?.status).toEqual(
        CacheStatus.HIT,
      );

      privacyPolicyEvaluationRecords.shouldRecord = true;
      await ParentEntity.deleter(parent).deleteAsync();
      privacyPolicyEvaluationRecords.shouldRecord = false;

      const childCachedAfter = await childCacheAdapter.loadManyAsync(
        new SingleFieldHolder('parent_id'),
        [new SingleFieldValueHolder(parent.getID())],
      );
      expect(childCachedAfter.get(new SingleFieldValueHolder(parent.getID()))?.status).toEqual(
        CacheStatus.MISS,
      );

      const grandChildCachedAfter = await grandChildCacheAdapter.loadManyAsync(
        new SingleFieldHolder('parent_id'),
        [new SingleFieldValueHolder(child.getID())],
      );
      expect(grandChildCachedAfter.get(new SingleFieldValueHolder(child.getID()))?.status).toEqual(
        CacheStatus.MISS,
      );

      await expect(
        ParentEntity.loader(viewerContext).loadByIDNullableAsync(parent.getID()),
      ).resolves.toBeNull();
      await expect(
        ChildEntity.loader(viewerContext).loadByIDNullableAsync(child.getID()),
      ).resolves.not.toBeNull();
      await expect(
        GrandChildEntity.loader(viewerContext).loadByIDNullableAsync(grandchild.getID()),
      ).resolves.not.toBeNull();

      // two calls for each trigger, one beforeDelete, one afterDelete
      expect(triggerExecutionCounts).toMatchObject({
        ParentEntityDeletion: 2,
        ChildEntityDeletion: 2,
        GrandChildEntityDeletion: 2,

        ParentEntityUpdate: 0,
        ChildEntityUpdate: 0,
        GrandChildEntityUpdate: 0,
      });

      expect(privacyPolicyEvaluationRecords).toMatchObject({
        ParentEntity: {
          [EntityAuthorizationAction.CREATE]: [],
          [EntityAuthorizationAction.READ]: [],
          [EntityAuthorizationAction.UPDATE]: [],
          // one DELETE auth action for parent (since it's being deleted)
          [EntityAuthorizationAction.DELETE]: [{ cascadingDeleteCause: null }],
        },
        ChildEntity: {
          [EntityAuthorizationAction.CREATE]: [],
          // one READ auth action for child in order to delete via cascade
          [EntityAuthorizationAction.READ]: [
            {
              cascadingDeleteCause: {
                entity: expect.any(ParentEntity),
                cascadingDeleteCause: null,
              },
            },
          ],
          [EntityAuthorizationAction.UPDATE]: [],
          // one DELETE auth action for child (since it's being deleted via cascade)
          [EntityAuthorizationAction.DELETE]: [
            {
              cascadingDeleteCause: {
                entity: expect.any(ParentEntity),
                cascadingDeleteCause: null,
              },
            },
          ],
        },
        GrandChildEntity: {
          [EntityAuthorizationAction.CREATE]: [],
          // one READ auth action for grandchild in order to delete via cascade
          [EntityAuthorizationAction.READ]: [
            {
              cascadingDeleteCause: {
                entity: expect.any(ChildEntity),
                cascadingDeleteCause: {
                  entity: expect.any(ParentEntity),
                  cascadingDeleteCause: null,
                },
              },
            },
          ],
          [EntityAuthorizationAction.UPDATE]: [],
          // one DELETE auth action for grandchild (since it's being deleted via cascade)
          [EntityAuthorizationAction.DELETE]: [
            {
              cascadingDeleteCause: {
                entity: expect.any(ChildEntity),
                cascadingDeleteCause: {
                  entity: expect.any(ParentEntity),
                  cascadingDeleteCause: null,
                },
              },
            },
          ],
        },
      });
    });
  });
});

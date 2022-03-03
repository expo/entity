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
import PrivacyPolicyRule, { RuleEvaluationResult } from '../rules/PrivacyPolicyRule';
import TestViewerContext from '../testfixtures/TestViewerContext';
import { InMemoryFullCacheStubCacheAdapter } from '../utils/testing/StubCacheAdapter';
import { createUnitTestEntityCompanionProvider } from '../utils/testing/createUnitTestEntityCompanionProvider';

interface ParentFields {
  id: string;
}

interface ChildFields {
  id: string;
  parent_id: string;
}

interface GrandChildFields {
  id: string;
  parent_id: string;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const makeEntityClasses = (edgeDeletionBehavior: EntityEdgeDeletionBehavior) => {
  const triggerExecutionCounts = {
    ParentEntity: 0,
    ChildEntity: 0,
    GrandChildEntity: 0,
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
    string,
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
      evaluationContext: EntityPrivacyPolicyEvaluationContext,
      entity: any
    ): Promise<RuleEvaluationResult> {
      if (privacyPolicyEvaluationRecords.shouldRecord) {
        (privacyPolicyEvaluationRecords as any)[entity.constructor.name][this.action].push(
          evaluationContext
        );
      }
      return RuleEvaluationResult.ALLOW;
    }
  }

  class TestEntityPrivacyPolicy extends EntityPrivacyPolicy<
    any,
    string,
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

  class ParentCheckInfoTrigger extends EntityMutationTrigger<
    ParentFields,
    string,
    TestViewerContext,
    ParentEntity
  > {
    async executeAsync(
      _viewerContext: TestViewerContext,
      _queryContext: EntityTransactionalQueryContext,
      _entity: ParentEntity,
      mutationInfo: EntityTriggerMutationInfo<ParentFields, string, TestViewerContext, ParentEntity>
    ): Promise<void> {
      if (mutationInfo.type !== EntityMutationType.DELETE) {
        return;
      }

      if (mutationInfo.cascadingDeleteCause !== null) {
        throw new Error('Parent entity should not have casade delete cause');
      }

      triggerExecutionCounts.ParentEntity++;
    }
  }

  class ChildCheckInfoTrigger extends EntityMutationTrigger<
    ChildFields,
    string,
    TestViewerContext,
    ChildEntity
  > {
    async executeAsync(
      _viewerContext: TestViewerContext,
      _queryContext: EntityTransactionalQueryContext,
      _entity: ChildEntity,
      mutationInfo: EntityTriggerMutationInfo<ChildFields, string, TestViewerContext, ChildEntity>
    ): Promise<void> {
      if (mutationInfo.type !== EntityMutationType.DELETE) {
        return;
      }

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

      triggerExecutionCounts.ChildEntity++;
    }
  }

  class GrandChildCheckInfoTrigger extends EntityMutationTrigger<
    GrandChildFields,
    string,
    TestViewerContext,
    GrandChildEntity
  > {
    async executeAsync(
      _viewerContext: TestViewerContext,
      _queryContext: EntityTransactionalQueryContext,
      _entity: GrandChildEntity,
      mutationInfo: EntityTriggerMutationInfo<
        GrandChildFields,
        string,
        TestViewerContext,
        GrandChildEntity
      >
    ): Promise<void> {
      if (mutationInfo.type !== EntityMutationType.DELETE) {
        return;
      }

      if (mutationInfo.cascadingDeleteCause === null) {
        throw new Error('GrandChild entity should have cascade delete cause');
      }

      const cascadingDeleteCauseEntity = mutationInfo.cascadingDeleteCause.entity;
      if (!(cascadingDeleteCauseEntity instanceof ChildEntity)) {
        throw new Error(
          'GrandChild entity should have cascade delete cause entity of type ChildEntity'
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
          'GrandChild entity should have second level casade delete cause entity of type ParentEntity'
        );
      }

      const thirdLevelCascadingDeleteCause = secondLevelCascadingDeleteCause.cascadingDeleteCause;
      if (thirdLevelCascadingDeleteCause) {
        throw new Error('GrandChild entity should not have three-level casade delete cause');
      }

      triggerExecutionCounts.GrandChildEntity++;
    }
  }

  class ParentEntity extends Entity<ParentFields, string, TestViewerContext> {
    static getCompanionDefinition(): EntityCompanionDefinition<
      ParentFields,
      string,
      TestViewerContext,
      ParentEntity,
      TestEntityPrivacyPolicy
    > {
      return parentEntityCompanion;
    }
  }

  class ChildEntity extends Entity<ChildFields, string, TestViewerContext> {
    static getCompanionDefinition(): EntityCompanionDefinition<
      ChildFields,
      string,
      TestViewerContext,
      ChildEntity,
      TestEntityPrivacyPolicy
    > {
      return childEntityCompanion;
    }
  }

  class GrandChildEntity extends Entity<GrandChildFields, string, TestViewerContext> {
    static getCompanionDefinition(): EntityCompanionDefinition<
      GrandChildFields,
      string,
      TestViewerContext,
      GrandChildEntity,
      TestEntityPrivacyPolicy
    > {
      return grandChildEntityCompanion;
    }
  }

  const parentEntityConfiguration = new EntityConfiguration<ParentFields>({
    idField: 'id',
    tableName: 'parents',
    getInboundEdges: () => [ChildEntity],
    schema: {
      id: new UUIDField({
        columnName: 'id',
        cache: true,
      }),
    },
    databaseAdapterFlavor: 'postgres',
    cacheAdapterFlavor: 'redis',
  });

  const childEntityConfiguration = new EntityConfiguration<ChildFields>({
    idField: 'id',
    tableName: 'children',
    getInboundEdges: () => [GrandChildEntity],
    schema: {
      id: new UUIDField({
        columnName: 'id',
        cache: true,
      }),
      parent_id: new UUIDField({
        columnName: 'parent_id',
        cache: true,
        association: {
          getAssociatedEntityClass: () => ParentEntity,
          edgeDeletionBehavior,
        },
      }),
    },
    databaseAdapterFlavor: 'postgres',
    cacheAdapterFlavor: 'redis',
  });

  const grandChildEntityConfiguration = new EntityConfiguration<GrandChildFields>({
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
          getAssociatedEntityClass: () => ChildEntity,
          edgeDeletionBehavior,
        },
      }),
    },
    databaseAdapterFlavor: 'postgres',
    cacheAdapterFlavor: 'redis',
  });

  const parentEntityCompanion = new EntityCompanionDefinition({
    entityClass: ParentEntity,
    entityConfiguration: parentEntityConfiguration,
    privacyPolicyClass: TestEntityPrivacyPolicy,
    mutationTriggers: () => ({
      beforeDelete: [new ParentCheckInfoTrigger()],
      afterDelete: [new ParentCheckInfoTrigger()],
    }),
  });

  const childEntityCompanion = new EntityCompanionDefinition({
    entityClass: ChildEntity,
    entityConfiguration: childEntityConfiguration,
    privacyPolicyClass: TestEntityPrivacyPolicy,
    mutationTriggers: () => ({
      beforeDelete: [new ChildCheckInfoTrigger()],
      afterDelete: [new ChildCheckInfoTrigger()],
    }),
  });

  const grandChildEntityCompanion = new EntityCompanionDefinition({
    entityClass: GrandChildEntity,
    entityConfiguration: grandChildEntityConfiguration,
    privacyPolicyClass: TestEntityPrivacyPolicy,
    mutationTriggers: () => ({
      beforeDelete: [new GrandChildCheckInfoTrigger()],
      afterDelete: [new GrandChildCheckInfoTrigger()],
    }),
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

      const parent = await ParentEntity.creator(viewerContext).enforceCreateAsync();
      const child = await ChildEntity.creator(viewerContext)
        .setField('parent_id', parent.getID())
        .enforceCreateAsync();
      const grandchild = await GrandChildEntity.creator(viewerContext)
        .setField('parent_id', child.getID())
        .enforceCreateAsync();

      await expect(
        ParentEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(parent.getID())
      ).resolves.not.toBeNull();
      await expect(
        ChildEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(child.getID())
      ).resolves.not.toBeNull();
      await expect(
        GrandChildEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(grandchild.getID())
      ).resolves.not.toBeNull();

      privacyPolicyEvaluationRecords.shouldRecord = true;
      await ParentEntity.enforceDeleteAsync(parent);
      privacyPolicyEvaluationRecords.shouldRecord = false;

      await expect(
        ParentEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(parent.getID())
      ).resolves.toBeNull();
      await expect(
        ChildEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(child.getID())
      ).resolves.toBeNull();
      await expect(
        GrandChildEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(grandchild.getID())
      ).resolves.toBeNull();

      // two calls for each trigger, one beforeDelete, one afterDelete
      expect(triggerExecutionCounts).toMatchObject({
        ParentEntity: 2,
        ChildEntity: 2,
        GrandChildEntity: 2,
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

      const parent = await ParentEntity.creator(viewerContext).enforceCreateAsync();
      const child = await ChildEntity.creator(viewerContext)
        .setField('parent_id', parent.getID())
        .enforceCreateAsync();
      const grandchild = await GrandChildEntity.creator(viewerContext)
        .setField('parent_id', child.getID())
        .enforceCreateAsync();

      await expect(
        ParentEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(parent.getID())
      ).resolves.not.toBeNull();
      await expect(
        ChildEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(child.getID())
      ).resolves.not.toBeNull();
      await expect(
        GrandChildEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(grandchild.getID())
      ).resolves.not.toBeNull();

      privacyPolicyEvaluationRecords.shouldRecord = true;
      await ParentEntity.enforceDeleteAsync(parent);
      privacyPolicyEvaluationRecords.shouldRecord = false;

      await expect(
        ParentEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(parent.getID())
      ).resolves.toBeNull();

      const loadedChild = await ChildEntity.loader(viewerContext)
        .enforcing()
        .loadByIDAsync(child.getID());
      expect(loadedChild.getField('parent_id')).toBeNull();

      const loadedGrandchild = await GrandChildEntity.loader(viewerContext)
        .enforcing()
        .loadByIDAsync(grandchild.getID());
      expect(loadedGrandchild.getField('parent_id')).toEqual(loadedChild.getID());

      // two calls for only parent trigger, one beforeDelete, one afterDelete
      // when using set null the descendants aren't deleted
      expect(triggerExecutionCounts).toMatchObject({
        ParentEntity: 2,
        ChildEntity: 0,
        GrandChildEntity: 0,
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

  describe('EntityEdgeDeletionBehavior.CASCADE_DELETE_INVALIDATE_CACHE', () => {
    it('invalidates the cache', async () => {
      const {
        ParentEntity,
        ChildEntity,
        GrandChildEntity,
        triggerExecutionCounts,
        privacyPolicyEvaluationRecords,
      } = makeEntityClasses(EntityEdgeDeletionBehavior.CASCADE_DELETE_INVALIDATE_CACHE);

      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new TestViewerContext(companionProvider);

      const parent = await ParentEntity.creator(viewerContext).enforceCreateAsync();
      const child = await ChildEntity.creator(viewerContext)
        .setField('parent_id', parent.getID())
        .enforceCreateAsync();
      const grandchild = await GrandChildEntity.creator(viewerContext)
        .setField('parent_id', child.getID())
        .enforceCreateAsync();

      await expect(
        ParentEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(parent.getID())
      ).resolves.not.toBeNull();
      await expect(
        ChildEntity.loader(viewerContext)
          .enforcing()
          .loadByFieldEqualingAsync('parent_id', parent.getID())
      ).resolves.not.toBeNull();
      await expect(
        GrandChildEntity.loader(viewerContext)
          .enforcing()
          .loadByFieldEqualingAsync('parent_id', child.getID())
      ).resolves.not.toBeNull();

      const childCacheAdapter = viewerContext.getViewerScopedEntityCompanionForClass(ChildEntity)[
        'entityCompanion'
      ]['tableDataCoordinator']['cacheAdapter'] as InMemoryFullCacheStubCacheAdapter<ChildFields>;
      const childCachedBefore = await childCacheAdapter.loadManyAsync('parent_id', [
        parent.getID(),
      ]);
      expect(childCachedBefore.get(parent.getID())?.status).toEqual(CacheStatus.HIT);

      const grandChildCacheAdapter = viewerContext.getViewerScopedEntityCompanionForClass(
        GrandChildEntity
      )['entityCompanion']['tableDataCoordinator'][
        'cacheAdapter'
      ] as InMemoryFullCacheStubCacheAdapter<ChildFields>;
      const grandChildCachedBefore = await grandChildCacheAdapter.loadManyAsync('parent_id', [
        child.getID(),
      ]);
      expect(grandChildCachedBefore.get(child.getID())?.status).toEqual(CacheStatus.HIT);

      privacyPolicyEvaluationRecords.shouldRecord = true;
      await ParentEntity.enforceDeleteAsync(parent);
      privacyPolicyEvaluationRecords.shouldRecord = false;

      const childCachedAfter = await childCacheAdapter.loadManyAsync('parent_id', [parent.getID()]);
      expect(childCachedAfter.get(parent.getID())?.status).toEqual(CacheStatus.MISS);

      const grandChildCachedAfter = await grandChildCacheAdapter.loadManyAsync('parent_id', [
        child.getID(),
      ]);
      expect(grandChildCachedAfter.get(child.getID())?.status).toEqual(CacheStatus.MISS);

      await expect(
        ParentEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(parent.getID())
      ).resolves.toBeNull();
      await expect(
        ChildEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(child.getID())
      ).resolves.not.toBeNull();
      await expect(
        GrandChildEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(grandchild.getID())
      ).resolves.not.toBeNull();

      // two calls for each trigger, one beforeDelete, one afterDelete
      expect(triggerExecutionCounts).toMatchObject({
        ParentEntity: 2,
        ChildEntity: 2,
        GrandChildEntity: 2,
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

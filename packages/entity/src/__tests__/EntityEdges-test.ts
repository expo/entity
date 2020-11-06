import Entity from '../Entity';
import {
  DatabaseAdapterFlavor,
  CacheAdapterFlavor,
  EntityCompanionDefinition,
} from '../EntityCompanionProvider';
import EntityConfiguration from '../EntityConfiguration';
import { UUIDField, EntityEdgeDeletionBehavior } from '../EntityFields';
import EntityPrivacyPolicy from '../EntityPrivacyPolicy';
import { CacheStatus } from '../internal/ReadThroughEntityCache';
import AlwaysAllowPrivacyPolicyRule from '../rules/AlwaysAllowPrivacyPolicyRule';
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

class TestEntityPrivacyPolicy extends EntityPrivacyPolicy<
  any,
  string,
  TestViewerContext,
  any,
  any
> {
  protected readonly readRules = [new AlwaysAllowPrivacyPolicyRule()];
  protected readonly createRules = [new AlwaysAllowPrivacyPolicyRule()];
  protected readonly updateRules = [new AlwaysAllowPrivacyPolicyRule()];
  protected readonly deleteRules = [new AlwaysAllowPrivacyPolicyRule()];
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const makeEntityClasses = (edgeDeletionBehavior: EntityEdgeDeletionBehavior) => {
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
    databaseAdapterFlavor: DatabaseAdapterFlavor.POSTGRES,
    cacheAdapterFlavor: CacheAdapterFlavor.REDIS,
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
    databaseAdapterFlavor: DatabaseAdapterFlavor.POSTGRES,
    cacheAdapterFlavor: CacheAdapterFlavor.REDIS,
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
    databaseAdapterFlavor: DatabaseAdapterFlavor.POSTGRES,
    cacheAdapterFlavor: CacheAdapterFlavor.REDIS,
  });

  const parentEntityCompanion = new EntityCompanionDefinition({
    entityClass: ParentEntity,
    entityConfiguration: parentEntityConfiguration,
    privacyPolicyClass: TestEntityPrivacyPolicy,
  });

  const childEntityCompanion = new EntityCompanionDefinition({
    entityClass: ChildEntity,
    entityConfiguration: childEntityConfiguration,
    privacyPolicyClass: TestEntityPrivacyPolicy,
  });

  const grandChildEntityCompanion = new EntityCompanionDefinition({
    entityClass: GrandChildEntity,
    entityConfiguration: grandChildEntityConfiguration,
    privacyPolicyClass: TestEntityPrivacyPolicy,
  });

  return {
    ParentEntity,
    ChildEntity,
    GrandChildEntity,
  };
};

describe('EntityMutator.processEntityDeletionForInboundEdgesAsync', () => {
  describe('EntityEdgeDeletionBehavior.CASCADE_DELETE', () => {
    it('deletes', async () => {
      const { ParentEntity, ChildEntity, GrandChildEntity } = makeEntityClasses(
        EntityEdgeDeletionBehavior.CASCADE_DELETE
      );
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

      await ParentEntity.enforceDeleteAsync(parent);

      await expect(
        ParentEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(parent.getID())
      ).resolves.toBeNull();
      await expect(
        ChildEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(child.getID())
      ).resolves.toBeNull();
      await expect(
        GrandChildEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(grandchild.getID())
      ).resolves.toBeNull();
    });
  });

  describe('EntityEdgeDeletionBehavior.SET_NULL', () => {
    it('sets null', async () => {
      const { ParentEntity, ChildEntity, GrandChildEntity } = makeEntityClasses(
        EntityEdgeDeletionBehavior.SET_NULL
      );

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

      await ParentEntity.enforceDeleteAsync(parent);

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
    });
  });

  describe('EntityEdgeDeletionBehavior.CASCADE_DELETE_INVALIDATE_CACHE', () => {
    it('invalidates the cache', async () => {
      const { ParentEntity, ChildEntity, GrandChildEntity } = makeEntityClasses(
        EntityEdgeDeletionBehavior.CASCADE_DELETE_INVALIDATE_CACHE
      );

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

      await ParentEntity.enforceDeleteAsync(parent);

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
    });
  });
});

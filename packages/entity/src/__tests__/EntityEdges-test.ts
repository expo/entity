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

describe('EntityMutator.processEntityDeletionForInboundEdgesAsync', () => {
  describe('OnDeleteBehavior.DELETE', () => {
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

    const parentEntityConfiguration = new EntityConfiguration<ParentFields>({
      idField: 'id',
      tableName: 'parents',
      inboundEdges: [ChildEntity],
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
      schema: {
        id: new UUIDField({
          columnName: 'id',
          cache: true,
        }),
        parent_id: new UUIDField({
          columnName: 'parent_id',
          association: {
            associatedEntityClass: ParentEntity,
            edgeDeletionBehavior: EntityEdgeDeletionBehavior.CASCADE_DELETE,
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

    it('deletes', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new TestViewerContext(companionProvider);

      const parent = await ParentEntity.creator(viewerContext).enforceCreateAsync();
      const child = await ChildEntity.creator(viewerContext)
        .setField('parent_id', parent.getID())
        .enforceCreateAsync();

      await expect(
        ParentEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(parent.getID())
      ).resolves.not.toBeNull();
      await expect(
        ChildEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(child.getID())
      ).resolves.not.toBeNull();

      await ParentEntity.enforceDeleteAsync(parent);

      await expect(
        ParentEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(parent.getID())
      ).resolves.toBeNull();
      await expect(
        ChildEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(child.getID())
      ).resolves.toBeNull();
    });
  });

  describe('OnDeleteBehavior.SET_NULL', () => {
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

    const parentEntityConfiguration = new EntityConfiguration<ParentFields>({
      idField: 'id',
      tableName: 'parents',
      inboundEdges: [ChildEntity],
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
      schema: {
        id: new UUIDField({
          columnName: 'id',
          cache: true,
        }),
        parent_id: new UUIDField({
          columnName: 'parent_id',
          association: {
            associatedEntityClass: ParentEntity,
            edgeDeletionBehavior: EntityEdgeDeletionBehavior.SET_NULL,
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

    it('sets null', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new TestViewerContext(companionProvider);

      const parent = await ParentEntity.creator(viewerContext).enforceCreateAsync();
      const child = await ChildEntity.creator(viewerContext)
        .setField('parent_id', parent.getID())
        .enforceCreateAsync();

      await expect(
        ParentEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(parent.getID())
      ).resolves.not.toBeNull();
      await expect(
        ChildEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(child.getID())
      ).resolves.not.toBeNull();

      await ParentEntity.enforceDeleteAsync(parent);

      await expect(
        ParentEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(parent.getID())
      ).resolves.toBeNull();

      const loadedChild = await ChildEntity.loader(viewerContext)
        .enforcing()
        .loadByIDAsync(child.getID());
      expect(loadedChild.getField('parent_id')).toBeNull();
    });
  });

  describe('OnDeleteBehavior.INVALIDATE_CACHE', () => {
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

    const parentEntityConfiguration = new EntityConfiguration<ParentFields>({
      idField: 'id',
      tableName: 'parents',
      inboundEdges: [ChildEntity],
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
      schema: {
        id: new UUIDField({
          columnName: 'id',
          cache: true,
        }),
        parent_id: new UUIDField({
          columnName: 'parent_id',
          cache: true,
          association: {
            associatedEntityClass: ParentEntity,
            edgeDeletionBehavior: EntityEdgeDeletionBehavior.INVALIDATE_CACHE,
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

    it('invalidates the cache', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new TestViewerContext(companionProvider);

      const parent = await ParentEntity.creator(viewerContext).enforceCreateAsync();
      const child = await ChildEntity.creator(viewerContext)
        .setField('parent_id', parent.getID())
        .enforceCreateAsync();

      await expect(
        ParentEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(parent.getID())
      ).resolves.not.toBeNull();
      await expect(
        ChildEntity.loader(viewerContext)
          .enforcing()
          .loadByFieldEqualingAsync('parent_id', parent.getID())
      ).resolves.not.toBeNull();

      const cacheAdapter = viewerContext.getViewerScopedEntityCompanionForClass(ChildEntity)[
        'entityCompanion'
      ]['tableDataCoordinator']['cacheAdapter'] as InMemoryFullCacheStubCacheAdapter<ChildFields>;
      const cachedBefore = await cacheAdapter.loadManyAsync('parent_id', [parent.getID()]);
      expect(cachedBefore.get(parent.getID())?.status).toEqual(CacheStatus.HIT);

      await ParentEntity.enforceDeleteAsync(parent);

      const cachedAfter = await cacheAdapter.loadManyAsync('parent_id', [parent.getID()]);
      expect(cachedAfter.get(parent.getID())?.status).toEqual(CacheStatus.MISS);

      await expect(
        ParentEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(parent.getID())
      ).resolves.toBeNull();

      await expect(
        ChildEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(child.getID())
      ).resolves.not.toBeNull();
    });
  });
});

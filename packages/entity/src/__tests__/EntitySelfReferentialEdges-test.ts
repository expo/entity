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

interface CategoryFields {
  id: string;
  parent_category_id: string | null;
}

class CategoryPrivacyPolicy extends EntityPrivacyPolicy<
  CategoryFields,
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
const makeEntityClass = (edgeDeletionBehavior: EntityEdgeDeletionBehavior) => {
  class CategoryEntity extends Entity<CategoryFields, string, TestViewerContext> {
    static getCompanionDefinition(): EntityCompanionDefinition<
      CategoryFields,
      string,
      TestViewerContext,
      CategoryEntity,
      CategoryPrivacyPolicy
    > {
      return categoryEntityCompanion;
    }
  }

  const categoryEntityConfiguration = new EntityConfiguration<CategoryFields>({
    idField: 'id',
    tableName: 'categories',
    inboundEdges: [CategoryEntity],
    schema: {
      id: new UUIDField({
        columnName: 'id',
        cache: true,
      }),
      parent_category_id: new UUIDField({
        columnName: 'parent_category_id',
        cache: true,
        association: {
          associatedEntityClass: CategoryEntity,
          edgeDeletionBehavior,
        },
      }),
    },
    databaseAdapterFlavor: DatabaseAdapterFlavor.POSTGRES,
    cacheAdapterFlavor: CacheAdapterFlavor.REDIS,
  });

  const categoryEntityCompanion = new EntityCompanionDefinition({
    entityClass: CategoryEntity,
    entityConfiguration: categoryEntityConfiguration,
    privacyPolicyClass: CategoryPrivacyPolicy,
  });

  return {
    CategoryEntity,
  };
};

describe('EntityEdgeDeletionBehavior.CASCADE_DELETE', () => {
  it('deletes', async () => {
    const { CategoryEntity } = makeEntityClass(EntityEdgeDeletionBehavior.CASCADE_DELETE);
    const companionProvider = createUnitTestEntityCompanionProvider();
    const viewerContext = new TestViewerContext(companionProvider);

    const parentCategory = await CategoryEntity.creator(viewerContext).enforceCreateAsync();
    const subCategory = await CategoryEntity.creator(viewerContext)
      .setField('parent_category_id', parentCategory.getID())
      .enforceCreateAsync();
    const subSubCategory = await CategoryEntity.creator(viewerContext)
      .setField('parent_category_id', subCategory.getID())
      .enforceCreateAsync();

    await expect(
      CategoryEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(parentCategory.getID())
    ).resolves.not.toBeNull();
    await expect(
      CategoryEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(subCategory.getID())
    ).resolves.not.toBeNull();
    await expect(
      CategoryEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(subSubCategory.getID())
    ).resolves.not.toBeNull();

    await CategoryEntity.enforceDeleteAsync(parentCategory);

    await expect(
      CategoryEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(parentCategory.getID())
    ).resolves.toBeNull();
    await expect(
      CategoryEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(subCategory.getID())
    ).resolves.toBeNull();
    await expect(
      CategoryEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(subSubCategory.getID())
    ).resolves.toBeNull();
  });
});

describe('EntityEdgeDeletionBehavior.SET_NULL', () => {
  it('sets null', async () => {
    const { CategoryEntity } = makeEntityClass(EntityEdgeDeletionBehavior.SET_NULL);

    const companionProvider = createUnitTestEntityCompanionProvider();
    const viewerContext = new TestViewerContext(companionProvider);

    const parentCategory = await CategoryEntity.creator(viewerContext).enforceCreateAsync();
    const subCategory = await CategoryEntity.creator(viewerContext)
      .setField('parent_category_id', parentCategory.getID())
      .enforceCreateAsync();
    const subSubCategory = await CategoryEntity.creator(viewerContext)
      .setField('parent_category_id', subCategory.getID())
      .enforceCreateAsync();

    await expect(
      CategoryEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(parentCategory.getID())
    ).resolves.not.toBeNull();
    await expect(
      CategoryEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(subCategory.getID())
    ).resolves.not.toBeNull();
    await expect(
      CategoryEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(subSubCategory.getID())
    ).resolves.not.toBeNull();

    await CategoryEntity.enforceDeleteAsync(parentCategory);

    await expect(
      CategoryEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(parentCategory.getID())
    ).resolves.toBeNull();

    const loadedSubCategory = await CategoryEntity.loader(viewerContext)
      .enforcing()
      .loadByIDAsync(subCategory.getID());
    expect(loadedSubCategory.getField('parent_category_id')).toBeNull();

    const loadedSubSubCategory = await CategoryEntity.loader(viewerContext)
      .enforcing()
      .loadByIDAsync(subSubCategory.getID());
    expect(loadedSubSubCategory.getField('parent_category_id')).not.toBeNull();
  });
});

describe('EntityEdgeDeletionBehavior.CASCADE_DELETE_INVALIDATE_CACHE', () => {
  it('invalidates the cache', async () => {
    const { CategoryEntity } = makeEntityClass(
      EntityEdgeDeletionBehavior.CASCADE_DELETE_INVALIDATE_CACHE
    );

    const companionProvider = createUnitTestEntityCompanionProvider();
    const viewerContext = new TestViewerContext(companionProvider);

    const parentCategory = await CategoryEntity.creator(viewerContext).enforceCreateAsync();
    const subCategory = await CategoryEntity.creator(viewerContext)
      .setField('parent_category_id', parentCategory.getID())
      .enforceCreateAsync();
    const subSubCategory = await CategoryEntity.creator(viewerContext)
      .setField('parent_category_id', subCategory.getID())
      .enforceCreateAsync();

    await expect(
      CategoryEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(parentCategory.getID())
    ).resolves.not.toBeNull();
    await expect(
      CategoryEntity.loader(viewerContext)
        .enforcing()
        .loadByFieldEqualingAsync('parent_category_id', parentCategory.getID())
    ).resolves.not.toBeNull();
    await expect(
      CategoryEntity.loader(viewerContext)
        .enforcing()
        .loadByFieldEqualingAsync('parent_category_id', subCategory.getID())
    ).resolves.not.toBeNull();

    const subCategoryCacheAdapter = viewerContext.getViewerScopedEntityCompanionForClass(
      CategoryEntity
    )['entityCompanion']['tableDataCoordinator'][
      'cacheAdapter'
    ] as InMemoryFullCacheStubCacheAdapter<CategoryFields>;
    const subCategoryCachedBefore = await subCategoryCacheAdapter.loadManyAsync(
      'parent_category_id',
      [parentCategory.getID()]
    );
    expect(subCategoryCachedBefore.get(parentCategory.getID())?.status).toEqual(CacheStatus.HIT);

    const subSubCategoryCacheAdapter = viewerContext.getViewerScopedEntityCompanionForClass(
      CategoryEntity
    )['entityCompanion']['tableDataCoordinator'][
      'cacheAdapter'
    ] as InMemoryFullCacheStubCacheAdapter<CategoryFields>;
    const subSubCategoryCachedBefore = await subSubCategoryCacheAdapter.loadManyAsync(
      'parent_category_id',
      [subCategory.getID()]
    );
    expect(subSubCategoryCachedBefore.get(subCategory.getID())?.status).toEqual(CacheStatus.HIT);

    await CategoryEntity.enforceDeleteAsync(parentCategory);

    const subCategoryCachedAfter = await subCategoryCacheAdapter.loadManyAsync(
      'parent_category_id',
      [parentCategory.getID()]
    );
    expect(subCategoryCachedAfter.get(parentCategory.getID())?.status).toEqual(CacheStatus.MISS);

    const subSubCategoryCachedAfter = await subSubCategoryCacheAdapter.loadManyAsync(
      'parent_category_id',
      [subCategory.getID()]
    );
    expect(subSubCategoryCachedAfter.get(subCategory.getID())?.status).toEqual(CacheStatus.MISS);

    await expect(
      CategoryEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(parentCategory.getID())
    ).resolves.toBeNull();
    await expect(
      CategoryEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(subCategory.getID())
    ).resolves.not.toBeNull();
    await expect(
      CategoryEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(subSubCategory.getID())
    ).resolves.not.toBeNull();
  });
});

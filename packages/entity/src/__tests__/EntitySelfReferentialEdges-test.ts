import Entity from '../Entity';
import { EntityCompanionDefinition } from '../EntityCompanionProvider';
import EntityConfiguration from '../EntityConfiguration';
import { EntityEdgeDeletionBehavior } from '../EntityFieldDefinition';
import { UUIDField } from '../EntityFields';
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
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<CategoryFields, string, TestViewerContext, any, any>(),
  ];
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<CategoryFields, string, TestViewerContext, any, any>(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<CategoryFields, string, TestViewerContext, any, any>(),
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<CategoryFields, string, TestViewerContext, any, any>(),
  ];
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const makeEntityClass = (edgeDeletionBehavior: EntityEdgeDeletionBehavior) => {
  class CategoryEntity extends Entity<CategoryFields, string, TestViewerContext> {
    static defineCompanionDefinition(): EntityCompanionDefinition<
      CategoryFields,
      string,
      TestViewerContext,
      CategoryEntity,
      CategoryPrivacyPolicy
    > {
      return {
        entityClass: CategoryEntity,
        entityConfiguration: categoryEntityConfiguration,
        privacyPolicyClass: CategoryPrivacyPolicy,
      };
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
    databaseAdapterFlavor: 'postgres',
    cacheAdapterFlavor: 'redis',
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

    const parentCategory = await CategoryEntity.creator(viewerContext).enforcing().createAsync();
    const subCategory = await CategoryEntity.creator(viewerContext)
      .enforcing()
      .setField('parent_category_id', parentCategory.getID())
      .createAsync();
    const subSubCategory = await CategoryEntity.creator(viewerContext)
      .enforcing()
      .setField('parent_category_id', subCategory.getID())
      .createAsync();

    await expect(
      CategoryEntity.loader(viewerContext)
        .enforcing()
        .loadByIDNullableAsync(parentCategory.getID()),
    ).resolves.not.toBeNull();
    await expect(
      CategoryEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(subCategory.getID()),
    ).resolves.not.toBeNull();
    await expect(
      CategoryEntity.loader(viewerContext)
        .enforcing()
        .loadByIDNullableAsync(subSubCategory.getID()),
    ).resolves.not.toBeNull();

    await CategoryEntity.deleter(parentCategory).enforcing().deleteAsync();

    await expect(
      CategoryEntity.loader(viewerContext)
        .enforcing()
        .loadByIDNullableAsync(parentCategory.getID()),
    ).resolves.toBeNull();
    await expect(
      CategoryEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(subCategory.getID()),
    ).resolves.toBeNull();
    await expect(
      CategoryEntity.loader(viewerContext)
        .enforcing()
        .loadByIDNullableAsync(subSubCategory.getID()),
    ).resolves.toBeNull();
  });

  it('handles cycles', async () => {
    const { CategoryEntity } = makeEntityClass(EntityEdgeDeletionBehavior.CASCADE_DELETE);

    const companionProvider = createUnitTestEntityCompanionProvider();
    const viewerContext = new TestViewerContext(companionProvider);

    const categoryA = await CategoryEntity.creator(viewerContext).enforcing().createAsync();
    const categoryB = await CategoryEntity.creator(viewerContext)
      .enforcing()
      .setField('parent_category_id', categoryA.getID())
      .createAsync();
    await CategoryEntity.updater(categoryA)
      .enforcing()
      .setField('parent_category_id', categoryB.getID())
      .updateAsync();

    await CategoryEntity.deleter(categoryA).enforcing().deleteAsync();

    await expect(
      CategoryEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(categoryA.getID()),
    ).resolves.toBeNull();
    await expect(
      CategoryEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(categoryB.getID()),
    ).resolves.toBeNull();
  });
});

describe('EntityEdgeDeletionBehavior.SET_NULL', () => {
  it('sets null', async () => {
    const { CategoryEntity } = makeEntityClass(EntityEdgeDeletionBehavior.SET_NULL);

    const companionProvider = createUnitTestEntityCompanionProvider();
    const viewerContext = new TestViewerContext(companionProvider);

    const parentCategory = await CategoryEntity.creator(viewerContext).enforcing().createAsync();
    const subCategory = await CategoryEntity.creator(viewerContext)
      .enforcing()
      .setField('parent_category_id', parentCategory.getID())
      .createAsync();
    const subSubCategory = await CategoryEntity.creator(viewerContext)
      .enforcing()
      .setField('parent_category_id', subCategory.getID())
      .createAsync();

    await expect(
      CategoryEntity.loader(viewerContext)
        .enforcing()
        .loadByIDNullableAsync(parentCategory.getID()),
    ).resolves.not.toBeNull();
    await expect(
      CategoryEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(subCategory.getID()),
    ).resolves.not.toBeNull();
    await expect(
      CategoryEntity.loader(viewerContext)
        .enforcing()
        .loadByIDNullableAsync(subSubCategory.getID()),
    ).resolves.not.toBeNull();

    await CategoryEntity.deleter(parentCategory).enforcing().deleteAsync();

    await expect(
      CategoryEntity.loader(viewerContext)
        .enforcing()
        .loadByIDNullableAsync(parentCategory.getID()),
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

  it('handles cycles', async () => {
    const { CategoryEntity } = makeEntityClass(EntityEdgeDeletionBehavior.SET_NULL);

    const companionProvider = createUnitTestEntityCompanionProvider();
    const viewerContext = new TestViewerContext(companionProvider);

    const categoryA = await CategoryEntity.creator(viewerContext).enforcing().createAsync();
    const categoryB = await CategoryEntity.creator(viewerContext)
      .enforcing()
      .setField('parent_category_id', categoryA.getID())
      .createAsync();
    await CategoryEntity.updater(categoryA)
      .enforcing()
      .setField('parent_category_id', categoryB.getID())
      .updateAsync();

    await CategoryEntity.deleter(categoryA).enforcing().deleteAsync();

    const loadedCategoryB = await CategoryEntity.loader(viewerContext)
      .enforcing()
      .loadByIDAsync(categoryB.getID());
    expect(loadedCategoryB.getField('parent_category_id')).toBeNull();
  });
});

describe('EntityEdgeDeletionBehavior.CASCADE_DELETE_INVALIDATE_CACHE', () => {
  it('invalidates the cache', async () => {
    const { CategoryEntity } = makeEntityClass(
      EntityEdgeDeletionBehavior.CASCADE_DELETE_INVALIDATE_CACHE_ONLY,
    );

    const companionProvider = createUnitTestEntityCompanionProvider();
    const viewerContext = new TestViewerContext(companionProvider);

    const parentCategory = await CategoryEntity.creator(viewerContext).enforcing().createAsync();
    const subCategory = await CategoryEntity.creator(viewerContext)
      .enforcing()
      .setField('parent_category_id', parentCategory.getID())
      .createAsync();
    const subSubCategory = await CategoryEntity.creator(viewerContext)
      .enforcing()
      .setField('parent_category_id', subCategory.getID())
      .createAsync();

    await expect(
      CategoryEntity.loader(viewerContext)
        .enforcing()
        .loadByIDNullableAsync(parentCategory.getID()),
    ).resolves.not.toBeNull();
    await expect(
      CategoryEntity.loader(viewerContext)
        .enforcing()
        .loadByFieldEqualingAsync('parent_category_id', parentCategory.getID()),
    ).resolves.not.toBeNull();
    await expect(
      CategoryEntity.loader(viewerContext)
        .enforcing()
        .loadByFieldEqualingAsync('parent_category_id', subCategory.getID()),
    ).resolves.not.toBeNull();

    const categoryCacheAdapter = viewerContext.getViewerScopedEntityCompanionForClass(
      CategoryEntity,
    )['entityCompanion']['tableDataCoordinator'][
      'cacheAdapter'
    ] as InMemoryFullCacheStubCacheAdapter<CategoryFields>;
    const subCategoryCachedBefore = await categoryCacheAdapter.loadManyAsync('parent_category_id', [
      parentCategory.getID(),
    ]);
    expect(subCategoryCachedBefore.get(parentCategory.getID())?.status).toEqual(CacheStatus.HIT);

    const subSubCategoryCachedBefore = await categoryCacheAdapter.loadManyAsync(
      'parent_category_id',
      [subCategory.getID()],
    );
    expect(subSubCategoryCachedBefore.get(subCategory.getID())?.status).toEqual(CacheStatus.HIT);

    await CategoryEntity.deleter(parentCategory).enforcing().deleteAsync();

    const subCategoryCachedAfter = await categoryCacheAdapter.loadManyAsync('parent_category_id', [
      parentCategory.getID(),
    ]);
    expect(subCategoryCachedAfter.get(parentCategory.getID())?.status).toEqual(CacheStatus.MISS);

    const subSubCategoryCachedAfter = await categoryCacheAdapter.loadManyAsync(
      'parent_category_id',
      [subCategory.getID()],
    );
    expect(subSubCategoryCachedAfter.get(subCategory.getID())?.status).toEqual(CacheStatus.MISS);

    await expect(
      CategoryEntity.loader(viewerContext)
        .enforcing()
        .loadByIDNullableAsync(parentCategory.getID()),
    ).resolves.toBeNull();
    await expect(
      CategoryEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(subCategory.getID()),
    ).resolves.not.toBeNull();
    await expect(
      CategoryEntity.loader(viewerContext)
        .enforcing()
        .loadByIDNullableAsync(subSubCategory.getID()),
    ).resolves.not.toBeNull();
  });

  it('handles cycles', async () => {
    const { CategoryEntity } = makeEntityClass(
      EntityEdgeDeletionBehavior.CASCADE_DELETE_INVALIDATE_CACHE_ONLY,
    );

    const companionProvider = createUnitTestEntityCompanionProvider();
    const viewerContext = new TestViewerContext(companionProvider);

    const categoryA = await CategoryEntity.creator(viewerContext).enforcing().createAsync();
    const categoryB = await CategoryEntity.creator(viewerContext)
      .enforcing()
      .setField('parent_category_id', categoryA.getID())
      .createAsync();
    await CategoryEntity.updater(categoryA)
      .enforcing()
      .setField('parent_category_id', categoryB.getID())
      .updateAsync();

    await expect(
      CategoryEntity.loader(viewerContext)
        .enforcing()
        .loadByFieldEqualingAsync('parent_category_id', categoryA.getID()),
    ).resolves.not.toBeNull();
    await expect(
      CategoryEntity.loader(viewerContext)
        .enforcing()
        .loadByFieldEqualingAsync('parent_category_id', categoryB.getID()),
    ).resolves.not.toBeNull();

    const categoryCacheAdapter = viewerContext.getViewerScopedEntityCompanionForClass(
      CategoryEntity,
    )['entityCompanion']['tableDataCoordinator'][
      'cacheAdapter'
    ] as InMemoryFullCacheStubCacheAdapter<CategoryFields>;
    const categoriesCachedBefore = await categoryCacheAdapter.loadManyAsync('parent_category_id', [
      categoryA.getID(),
      categoryB.getID(),
    ]);
    expect(categoriesCachedBefore.get(categoryA.getID())?.status).toEqual(CacheStatus.HIT);
    expect(categoriesCachedBefore.get(categoryB.getID())?.status).toEqual(CacheStatus.HIT);

    await CategoryEntity.deleter(categoryA).enforcing().deleteAsync();

    const categoriesCachedAfter = await categoryCacheAdapter.loadManyAsync('parent_category_id', [
      categoryA.getID(),
      categoryB.getID(),
    ]);
    expect(categoriesCachedAfter.get(categoryA.getID())?.status).toEqual(CacheStatus.MISS);
    expect(categoriesCachedAfter.get(categoryB.getID())?.status).toEqual(CacheStatus.MISS);
  });
});

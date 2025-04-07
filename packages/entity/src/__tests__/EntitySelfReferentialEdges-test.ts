import Entity from '../Entity';
import { EntityCompanionDefinition } from '../EntityCompanionProvider';
import EntityConfiguration from '../EntityConfiguration';
import { EntityEdgeDeletionBehavior } from '../EntityFieldDefinition';
import { UUIDField } from '../EntityFields';
import EntityPrivacyPolicy from '../EntityPrivacyPolicy';
import { CacheStatus } from '../internal/ReadThroughEntityCache';
import { SingleFieldHolder, SingleFieldValueHolder } from '../internal/SingleFieldHolder';
import AlwaysAllowPrivacyPolicyRule from '../rules/AlwaysAllowPrivacyPolicyRule';
import { InMemoryFullCacheStubCacheAdapter } from '../utils/__testfixtures__/StubCacheAdapter';
import TestViewerContext from '../utils/__testfixtures__/TestViewerContext';
import { createUnitTestEntityCompanionProvider } from '../utils/__testfixtures__/createUnitTestEntityCompanionProvider';

interface CategoryFields {
  id: string;
  parent_category_id: string | null;
}

class CategoryPrivacyPolicy extends EntityPrivacyPolicy<
  CategoryFields,
  'id',
  TestViewerContext,
  any,
  any
> {
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<CategoryFields, 'id', TestViewerContext, any, any>(),
  ];
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<CategoryFields, 'id', TestViewerContext, any, any>(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<CategoryFields, 'id', TestViewerContext, any, any>(),
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<CategoryFields, 'id', TestViewerContext, any, any>(),
  ];
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const makeEntityClass = (edgeDeletionBehavior: EntityEdgeDeletionBehavior) => {
  class CategoryEntity extends Entity<CategoryFields, 'id', TestViewerContext> {
    static defineCompanionDefinition(): EntityCompanionDefinition<
      CategoryFields,
      'id',
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

  const categoryEntityConfiguration = new EntityConfiguration<CategoryFields, 'id'>({
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

    const parentCategory = await CategoryEntity.creator(viewerContext).createAsync();
    const subCategory = await CategoryEntity.creator(viewerContext)
      .setField('parent_category_id', parentCategory.getID())
      .createAsync();
    const subSubCategory = await CategoryEntity.creator(viewerContext)
      .setField('parent_category_id', subCategory.getID())
      .createAsync();

    await expect(
      CategoryEntity.loader(viewerContext).loadByIDNullableAsync(parentCategory.getID()),
    ).resolves.not.toBeNull();
    await expect(
      CategoryEntity.loader(viewerContext).loadByIDNullableAsync(subCategory.getID()),
    ).resolves.not.toBeNull();
    await expect(
      CategoryEntity.loader(viewerContext).loadByIDNullableAsync(subSubCategory.getID()),
    ).resolves.not.toBeNull();

    await CategoryEntity.deleter(parentCategory).deleteAsync();

    await expect(
      CategoryEntity.loader(viewerContext).loadByIDNullableAsync(parentCategory.getID()),
    ).resolves.toBeNull();
    await expect(
      CategoryEntity.loader(viewerContext).loadByIDNullableAsync(subCategory.getID()),
    ).resolves.toBeNull();
    await expect(
      CategoryEntity.loader(viewerContext).loadByIDNullableAsync(subSubCategory.getID()),
    ).resolves.toBeNull();
  });

  it('handles cycles', async () => {
    const { CategoryEntity } = makeEntityClass(EntityEdgeDeletionBehavior.CASCADE_DELETE);

    const companionProvider = createUnitTestEntityCompanionProvider();
    const viewerContext = new TestViewerContext(companionProvider);

    const categoryA = await CategoryEntity.creator(viewerContext).createAsync();
    const categoryB = await CategoryEntity.creator(viewerContext)
      .setField('parent_category_id', categoryA.getID())
      .createAsync();
    await CategoryEntity.updater(categoryA)
      .setField('parent_category_id', categoryB.getID())
      .updateAsync();

    await CategoryEntity.deleter(categoryA).deleteAsync();

    await expect(
      CategoryEntity.loader(viewerContext).loadByIDNullableAsync(categoryA.getID()),
    ).resolves.toBeNull();
    await expect(
      CategoryEntity.loader(viewerContext).loadByIDNullableAsync(categoryB.getID()),
    ).resolves.toBeNull();
  });
});

describe('EntityEdgeDeletionBehavior.SET_NULL', () => {
  it('sets null', async () => {
    const { CategoryEntity } = makeEntityClass(EntityEdgeDeletionBehavior.SET_NULL);

    const companionProvider = createUnitTestEntityCompanionProvider();
    const viewerContext = new TestViewerContext(companionProvider);

    const parentCategory = await CategoryEntity.creator(viewerContext).createAsync();
    const subCategory = await CategoryEntity.creator(viewerContext)
      .setField('parent_category_id', parentCategory.getID())
      .createAsync();
    const subSubCategory = await CategoryEntity.creator(viewerContext)
      .setField('parent_category_id', subCategory.getID())
      .createAsync();

    await expect(
      CategoryEntity.loader(viewerContext).loadByIDNullableAsync(parentCategory.getID()),
    ).resolves.not.toBeNull();
    await expect(
      CategoryEntity.loader(viewerContext).loadByIDNullableAsync(subCategory.getID()),
    ).resolves.not.toBeNull();
    await expect(
      CategoryEntity.loader(viewerContext).loadByIDNullableAsync(subSubCategory.getID()),
    ).resolves.not.toBeNull();

    await CategoryEntity.deleter(parentCategory).deleteAsync();

    await expect(
      CategoryEntity.loader(viewerContext).loadByIDNullableAsync(parentCategory.getID()),
    ).resolves.toBeNull();

    const loadedSubCategory = await CategoryEntity.loader(viewerContext).loadByIDAsync(
      subCategory.getID(),
    );
    expect(loadedSubCategory.getField('parent_category_id')).toBeNull();

    const loadedSubSubCategory = await CategoryEntity.loader(viewerContext).loadByIDAsync(
      subSubCategory.getID(),
    );
    expect(loadedSubSubCategory.getField('parent_category_id')).not.toBeNull();
  });

  it('handles cycles', async () => {
    const { CategoryEntity } = makeEntityClass(EntityEdgeDeletionBehavior.SET_NULL);

    const companionProvider = createUnitTestEntityCompanionProvider();
    const viewerContext = new TestViewerContext(companionProvider);

    const categoryA = await CategoryEntity.creator(viewerContext).createAsync();
    const categoryB = await CategoryEntity.creator(viewerContext)
      .setField('parent_category_id', categoryA.getID())
      .createAsync();
    await CategoryEntity.updater(categoryA)
      .setField('parent_category_id', categoryB.getID())
      .updateAsync();

    await CategoryEntity.deleter(categoryA).deleteAsync();

    const loadedCategoryB = await CategoryEntity.loader(viewerContext).loadByIDAsync(
      categoryB.getID(),
    );
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

    const parentCategory = await CategoryEntity.creator(viewerContext).createAsync();
    const subCategory = await CategoryEntity.creator(viewerContext)
      .setField('parent_category_id', parentCategory.getID())
      .createAsync();
    const subSubCategory = await CategoryEntity.creator(viewerContext)
      .setField('parent_category_id', subCategory.getID())
      .createAsync();

    await expect(
      CategoryEntity.loader(viewerContext).loadByIDNullableAsync(parentCategory.getID()),
    ).resolves.not.toBeNull();
    await expect(
      CategoryEntity.loader(viewerContext).loadByFieldEqualingAsync(
        'parent_category_id',
        parentCategory.getID(),
      ),
    ).resolves.not.toBeNull();
    await expect(
      CategoryEntity.loader(viewerContext).loadByFieldEqualingAsync(
        'parent_category_id',
        subCategory.getID(),
      ),
    ).resolves.not.toBeNull();

    const categoryCacheAdapter = viewerContext.getViewerScopedEntityCompanionForClass(
      CategoryEntity,
    )['entityCompanion']['tableDataCoordinator'][
      'cacheAdapter'
    ] as InMemoryFullCacheStubCacheAdapter<CategoryFields, 'id'>;
    const subCategoryCachedBefore = await categoryCacheAdapter.loadManyAsync(
      new SingleFieldHolder('parent_category_id'),
      [new SingleFieldValueHolder(parentCategory.getID())],
    );
    expect(
      subCategoryCachedBefore.get(new SingleFieldValueHolder(parentCategory.getID()))?.status,
    ).toEqual(CacheStatus.HIT);

    const subSubCategoryCachedBefore = await categoryCacheAdapter.loadManyAsync(
      new SingleFieldHolder('parent_category_id'),
      [new SingleFieldValueHolder(subCategory.getID())],
    );
    expect(
      subSubCategoryCachedBefore.get(new SingleFieldValueHolder(subCategory.getID()))?.status,
    ).toEqual(CacheStatus.HIT);

    await CategoryEntity.deleter(parentCategory).deleteAsync();

    const subCategoryCachedAfter = await categoryCacheAdapter.loadManyAsync(
      new SingleFieldHolder('parent_category_id'),
      [new SingleFieldValueHolder(parentCategory.getID())],
    );
    expect(
      subCategoryCachedAfter.get(new SingleFieldValueHolder(parentCategory.getID()))?.status,
    ).toEqual(CacheStatus.MISS);

    const subSubCategoryCachedAfter = await categoryCacheAdapter.loadManyAsync(
      new SingleFieldHolder('parent_category_id'),
      [new SingleFieldValueHolder(subCategory.getID())],
    );
    expect(
      subSubCategoryCachedAfter.get(new SingleFieldValueHolder(subCategory.getID()))?.status,
    ).toEqual(CacheStatus.MISS);

    await expect(
      CategoryEntity.loader(viewerContext).loadByIDNullableAsync(parentCategory.getID()),
    ).resolves.toBeNull();
    await expect(
      CategoryEntity.loader(viewerContext).loadByIDNullableAsync(subCategory.getID()),
    ).resolves.not.toBeNull();
    await expect(
      CategoryEntity.loader(viewerContext).loadByIDNullableAsync(subSubCategory.getID()),
    ).resolves.not.toBeNull();
  });

  it('handles cycles', async () => {
    const { CategoryEntity } = makeEntityClass(
      EntityEdgeDeletionBehavior.CASCADE_DELETE_INVALIDATE_CACHE_ONLY,
    );

    const companionProvider = createUnitTestEntityCompanionProvider();
    const viewerContext = new TestViewerContext(companionProvider);

    const categoryA = await CategoryEntity.creator(viewerContext).createAsync();
    const categoryB = await CategoryEntity.creator(viewerContext)
      .setField('parent_category_id', categoryA.getID())
      .createAsync();
    await CategoryEntity.updater(categoryA)
      .setField('parent_category_id', categoryB.getID())
      .updateAsync();

    await expect(
      CategoryEntity.loader(viewerContext).loadByFieldEqualingAsync(
        'parent_category_id',
        categoryA.getID(),
      ),
    ).resolves.not.toBeNull();
    await expect(
      CategoryEntity.loader(viewerContext).loadByFieldEqualingAsync(
        'parent_category_id',
        categoryB.getID(),
      ),
    ).resolves.not.toBeNull();

    const categoryCacheAdapter = viewerContext.getViewerScopedEntityCompanionForClass(
      CategoryEntity,
    )['entityCompanion']['tableDataCoordinator'][
      'cacheAdapter'
    ] as InMemoryFullCacheStubCacheAdapter<CategoryFields, 'id'>;
    const categoriesCachedBefore = await categoryCacheAdapter.loadManyAsync(
      new SingleFieldHolder('parent_category_id'),
      [
        new SingleFieldValueHolder(categoryA.getID()),
        new SingleFieldValueHolder(categoryB.getID()),
      ],
    );
    expect(
      categoriesCachedBefore.get(new SingleFieldValueHolder(categoryA.getID()))?.status,
    ).toEqual(CacheStatus.HIT);
    expect(
      categoriesCachedBefore.get(new SingleFieldValueHolder(categoryB.getID()))?.status,
    ).toEqual(CacheStatus.HIT);

    await CategoryEntity.deleter(categoryA).deleteAsync();

    const categoriesCachedAfter = await categoryCacheAdapter.loadManyAsync(
      new SingleFieldHolder('parent_category_id'),
      [
        new SingleFieldValueHolder(categoryA.getID()),
        new SingleFieldValueHolder(categoryB.getID()),
      ],
    );
    expect(
      categoriesCachedAfter.get(new SingleFieldValueHolder(categoryA.getID()))?.status,
    ).toEqual(CacheStatus.MISS);
    expect(
      categoriesCachedAfter.get(new SingleFieldValueHolder(categoryB.getID()))?.status,
    ).toEqual(CacheStatus.MISS);
  });
});

import Entity from '../../Entity';
import { EntityCompanionDefinition } from '../../EntityCompanionProvider';
import EntityConfiguration from '../../EntityConfiguration';
import {
  EntityEdgeDeletionBehavior,
  EntityEdgeDeletionAuthorizationInferenceBehavior,
} from '../../EntityFieldDefinition';
import { UUIDField } from '../../EntityFields';
import EntityPrivacyPolicy from '../../EntityPrivacyPolicy';
import ReadonlyEntity from '../../ReadonlyEntity';
import ViewerContext from '../../ViewerContext';
import AlwaysAllowPrivacyPolicyRule from '../../rules/AlwaysAllowPrivacyPolicyRule';
import AlwaysDenyPrivacyPolicyRule from '../../rules/AlwaysDenyPrivacyPolicyRule';
import { canViewerDeleteAsync } from '../EntityPrivacyUtils';
import { createUnitTestEntityCompanionProvider } from '../testing/createUnitTestEntityCompanionProvider';

describe(canViewerDeleteAsync, () => {
  describe('edgeDeletionPermissionInferenceBehavior', () => {
    it('optimizes when EntityEdgeDeletionPermissionInferenceBehavior.ONE_IMPLIES_ALL', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);

      // create root
      const testEntity = await TestEntity.creator(viewerContext).createAsync();

      // create a bunch of leaves referencing root with
      // edgeDeletionPermissionInferenceBehavior = EntityEdgeDeletionPermissionInferenceBehavior.ONE_IMPLIES_ALL
      for (let i = 0; i < 10; i++) {
        await TestLeafEntity.creator(viewerContext)
          .setField('test_entity_id', testEntity.getID())
          .createAsync();
      }

      for (let i = 0; i < 10; i++) {
        await TestLeafLookupByFieldEntity.creator(viewerContext)
          .setField('test_entity_id', testEntity.getID())
          .createAsync();
      }

      const testLeafEntityCompanion =
        viewerContext.getViewerScopedEntityCompanionForClass(TestLeafEntity);
      const testLeafEntityAuthorizeDeleteSpy = jest.spyOn(
        testLeafEntityCompanion.entityCompanion.privacyPolicy,
        'authorizeDeleteAsync',
      );

      const testLeafLookupByFieldEntityCompanion =
        viewerContext.getViewerScopedEntityCompanionForClass(TestLeafLookupByFieldEntity);
      const testLeafLookupByFieldEntityAuthorizeDeleteSpy = jest.spyOn(
        testLeafLookupByFieldEntityCompanion.entityCompanion.privacyPolicy,
        'authorizeDeleteAsync',
      );

      const canViewerDelete = await canViewerDeleteAsync(TestEntity, testEntity);
      expect(canViewerDelete).toBe(true);

      expect(testLeafEntityAuthorizeDeleteSpy).toHaveBeenCalledTimes(1);
      expect(testLeafLookupByFieldEntityAuthorizeDeleteSpy).toHaveBeenCalledTimes(1);
    });

    it('does not optimize when undefined', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);

      // create root
      const testEntity = await TestEntity.creator(viewerContext).createAsync();

      // create a bunch of leaves with no edgeDeletionPermissionInferenceBehavior
      for (let i = 0; i < 10; i++) {
        await TestLeafNoInferenceEntity.creator(viewerContext)
          .setField('test_entity_id', testEntity.getID())
          .createAsync();
      }

      const companion =
        viewerContext.getViewerScopedEntityCompanionForClass(TestLeafNoInferenceEntity);
      const authorizeDeleteSpy = jest.spyOn(
        companion.entityCompanion.privacyPolicy,
        'authorizeDeleteAsync',
      );

      const canViewerDelete = await canViewerDeleteAsync(TestEntity, testEntity);
      expect(canViewerDelete).toBe(true);

      expect(authorizeDeleteSpy).toHaveBeenCalledTimes(10);
    });
  });
});

type TestEntityFields = {
  id: string;
};

type TestLeafEntityFields = {
  id: string;
  test_entity_id: string | null;
};

class AlwaysAllowEntityPrivacyPolicy<
  TFields extends Record<string, any>,
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

class TestEntity extends Entity<TestEntityFields, 'id', ViewerContext> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    TestEntityFields,
    'id',
    ViewerContext,
    TestEntity,
    AlwaysAllowEntityPrivacyPolicy<TestEntityFields, 'id', ViewerContext, TestEntity>
  > {
    return {
      entityClass: TestEntity,
      entityConfiguration: new EntityConfiguration<TestEntityFields, 'id'>({
        idField: 'id',
        tableName: 'blah',
        inboundEdges: [TestLeafEntity, TestLeafLookupByFieldEntity, TestLeafNoInferenceEntity],
        schema: {
          id: new UUIDField({
            columnName: 'custom_id',
          }),
        },
        databaseAdapterFlavor: 'postgres',
        cacheAdapterFlavor: 'redis',
      }),
      privacyPolicyClass: AlwaysAllowEntityPrivacyPolicy,
    };
  }
}

class TestLeafEntity extends Entity<TestLeafEntityFields, 'id', ViewerContext> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    TestLeafEntityFields,
    'id',
    ViewerContext,
    TestLeafEntity,
    AlwaysAllowEntityPrivacyPolicy<TestLeafEntityFields, 'id', ViewerContext, TestLeafEntity>
  > {
    return {
      entityClass: TestLeafEntity,
      entityConfiguration: new EntityConfiguration<TestLeafEntityFields, 'id'>({
        idField: 'id',
        tableName: 'blah_2',
        schema: {
          id: new UUIDField({
            columnName: 'custom_id',
          }),
          test_entity_id: new UUIDField({
            columnName: 'test_entity_id',
            association: {
              associatedEntityClass: TestEntity,
              edgeDeletionBehavior: EntityEdgeDeletionBehavior.CASCADE_DELETE,
              edgeDeletionAuthorizationInferenceBehavior:
                EntityEdgeDeletionAuthorizationInferenceBehavior.ONE_IMPLIES_ALL,
            },
          }),
        },
        databaseAdapterFlavor: 'postgres',
        cacheAdapterFlavor: 'redis',
      }),
      privacyPolicyClass: AlwaysAllowEntityPrivacyPolicy,
    };
  }
}

class TestLeafLookupByFieldEntity extends Entity<TestLeafEntityFields, 'id', ViewerContext> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    TestLeafEntityFields,
    'id',
    ViewerContext,
    TestLeafEntity,
    AlwaysAllowEntityPrivacyPolicy<TestLeafEntityFields, 'id', ViewerContext, TestLeafEntity>
  > {
    return {
      entityClass: TestLeafEntity,
      entityConfiguration: new EntityConfiguration<TestLeafEntityFields, 'id'>({
        idField: 'id',
        tableName: 'blah_4',
        schema: {
          id: new UUIDField({
            columnName: 'custom_id',
            cache: false,
          }),
          test_entity_id: new UUIDField({
            columnName: 'test_entity_id',
            association: {
              associatedEntityClass: TestEntity,
              edgeDeletionBehavior: EntityEdgeDeletionBehavior.CASCADE_DELETE,
              associatedEntityLookupByField: 'id',
              edgeDeletionAuthorizationInferenceBehavior:
                EntityEdgeDeletionAuthorizationInferenceBehavior.ONE_IMPLIES_ALL,
            },
          }),
        },
        databaseAdapterFlavor: 'postgres',
        cacheAdapterFlavor: 'redis',
      }),
      privacyPolicyClass: AlwaysAllowEntityPrivacyPolicy,
    };
  }
}

class TestLeafNoInferenceEntity extends Entity<TestLeafEntityFields, 'id', ViewerContext> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    TestLeafEntityFields,
    'id',
    ViewerContext,
    TestLeafNoInferenceEntity,
    AlwaysAllowEntityPrivacyPolicy<
      TestLeafEntityFields,
      'id',
      ViewerContext,
      TestLeafNoInferenceEntity
    >
  > {
    return {
      entityClass: TestLeafNoInferenceEntity,
      entityConfiguration: new EntityConfiguration<TestLeafEntityFields, 'id'>({
        idField: 'id',
        tableName: 'blah_3',
        schema: {
          id: new UUIDField({
            columnName: 'custom_id',
            cache: false,
          }),
          test_entity_id: new UUIDField({
            columnName: 'test_entity_id',
            association: {
              associatedEntityClass: TestEntity,
              edgeDeletionBehavior: EntityEdgeDeletionBehavior.CASCADE_DELETE,
            },
          }),
        },
        databaseAdapterFlavor: 'postgres',
        cacheAdapterFlavor: 'redis',
      }),
      privacyPolicyClass: AlwaysAllowEntityPrivacyPolicy,
    };
  }
}

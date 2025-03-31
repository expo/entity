import {
  AlwaysAllowPrivacyPolicyRule,
  Entity,
  EntityCompanionDefinition,
  EntityConfiguration,
  EntityEdgeDeletionBehavior,
  EntityPrivacyPolicy,
  UUIDField,
  ViewerContext,
} from '@expo/entity';

import ParentEntity from './ParentEntity';

interface ChildFields {
  id: string;
  parent_id: string;
}

class TestEntityPrivacyPolicy extends EntityPrivacyPolicy<any, 'id', ViewerContext, any, any> {
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<any, 'id', ViewerContext, any, any>(),
  ];
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<any, 'id', ViewerContext, any, any>(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<any, 'id', ViewerContext, any, any>(),
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<any, 'id', ViewerContext, any, any>(),
  ];
}

export default class ChildEntity extends Entity<ChildFields, 'id', ViewerContext> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    ChildFields,
    'id',
    ViewerContext,
    ChildEntity,
    TestEntityPrivacyPolicy
  > {
    return {
      entityClass: ChildEntity,
      entityConfiguration: new EntityConfiguration<ChildFields, 'id'>({
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
              edgeDeletionBehavior: EntityEdgeDeletionBehavior.CASCADE_DELETE_INVALIDATE_CACHE_ONLY,
            },
          }),
        },
        databaseAdapterFlavor: 'postgres',
        cacheAdapterFlavor: 'redis',
      }),
      privacyPolicyClass: TestEntityPrivacyPolicy,
    };
  }
}

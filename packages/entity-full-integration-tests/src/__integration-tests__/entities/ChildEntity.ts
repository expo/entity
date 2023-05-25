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

class TestEntityPrivacyPolicy extends EntityPrivacyPolicy<any, string, ViewerContext, any, any> {
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<any, string, ViewerContext, any, any>(),
  ];
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<any, string, ViewerContext, any, any>(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<any, string, ViewerContext, any, any>(),
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<any, string, ViewerContext, any, any>(),
  ];
}

export default class ChildEntity extends Entity<ChildFields, string, ViewerContext> {
  static getCompanionDefinition(): EntityCompanionDefinition<
    ChildFields,
    string,
    ViewerContext,
    ChildEntity,
    TestEntityPrivacyPolicy
  > {
    return childEntityCompanion;
  }
}

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
        getAssociatedEntityClass: async () => ParentEntity,
        edgeDeletionBehavior: EntityEdgeDeletionBehavior.CASCADE_DELETE_INVALIDATE_CACHE_ONLY,
      },
    }),
  },
  databaseAdapterFlavor: 'postgres',
  cacheAdapterFlavor: 'redis',
});

const childEntityCompanion = new EntityCompanionDefinition({
  entityClass: ChildEntity,
  entityConfiguration: childEntityConfiguration,
  privacyPolicyClass: TestEntityPrivacyPolicy,
});

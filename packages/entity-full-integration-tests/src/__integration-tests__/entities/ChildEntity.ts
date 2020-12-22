import {
  AlwaysAllowPrivacyPolicyRule,
  CacheAdapterFlavor,
  DatabaseAdapterFlavor,
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
  protected readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<any, string, ViewerContext, any, any>(),
  ];
  protected readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<any, string, ViewerContext, any, any>(),
  ];
  protected readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<any, string, ViewerContext, any, any>(),
  ];
  protected readonly deleteRules = [
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
        getAssociatedEntityClass: () => ParentEntity,
        edgeDeletionBehavior: EntityEdgeDeletionBehavior.CASCADE_DELETE_INVALIDATE_CACHE,
      },
    }),
  },
  databaseAdapterFlavor: DatabaseAdapterFlavor.POSTGRES,
  cacheAdapterFlavor: CacheAdapterFlavor.REDIS,
});

const childEntityCompanion = new EntityCompanionDefinition({
  entityClass: ChildEntity,
  entityConfiguration: childEntityConfiguration,
  privacyPolicyClass: TestEntityPrivacyPolicy,
});

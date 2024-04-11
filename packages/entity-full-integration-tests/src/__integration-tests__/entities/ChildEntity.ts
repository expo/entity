import {
  AlwaysAllowPrivacyPolicyRule,
  Entity,
  EntityCompanionDefinition,
  EntityConfiguration,
  EntityEdgeDeletionBehavior,
  EntityPrivacyPolicy,
  UUIDField,
} from '@expo/entity';

import ParentEntity from './ParentEntity';
import TestViewerContext from './TestViewerContext';

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
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<any, string, TestViewerContext, any, any>(),
  ];
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<any, string, TestViewerContext, any, any>(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<any, string, TestViewerContext, any, any>(),
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<any, string, TestViewerContext, any, any>(),
  ];
}

export default class ChildEntity extends Entity<ChildFields, string, TestViewerContext> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    ChildFields,
    string,
    TestViewerContext,
    ChildEntity,
    TestEntityPrivacyPolicy
  > {
    return {
      entityClass: ChildEntity,
      entityConfiguration: new EntityConfiguration<ChildFields>({
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

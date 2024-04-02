import {
  AlwaysAllowPrivacyPolicyRule,
  Entity,
  EntityCompanionDefinition,
  EntityConfiguration,
  EntityPrivacyPolicy,
  UUIDField,
} from '@expo/entity';

import ChildEntity from './ChildEntity';
import TestViewerContext from './TestViewerContext';

interface ParentFields {
  id: string;
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

export default class ParentEntity extends Entity<ParentFields, string, TestViewerContext> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    ParentFields,
    string,
    TestViewerContext,
    ParentEntity,
    TestEntityPrivacyPolicy
  > {
    return {
      entityClass: ParentEntity,
      entityConfiguration: new EntityConfiguration<ParentFields>({
        idField: 'id',
        tableName: 'parents',
        inboundEdges: [ChildEntity],
        schema: {
          id: new UUIDField({
            columnName: 'id',
            cache: true,
          }),
        },
        databaseAdapterFlavor: 'postgres',
        cacheAdapterFlavor: 'redis',
      }),
      privacyPolicyClass: TestEntityPrivacyPolicy,
    };
  }
}

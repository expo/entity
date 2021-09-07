import {
  AlwaysAllowPrivacyPolicyRule,
  Entity,
  EntityCompanionDefinition,
  EntityConfiguration,
  EntityPrivacyPolicy,
  UUIDField,
  ViewerContext,
} from '@expo/entity';

import ChildEntity from './ChildEntity';

interface ParentFields {
  id: string;
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

export default class ParentEntity extends Entity<ParentFields, string, ViewerContext> {
  static getCompanionDefinition(): EntityCompanionDefinition<
    ParentFields,
    string,
    ViewerContext,
    ParentEntity,
    TestEntityPrivacyPolicy
  > {
    return parentEntityCompanion;
  }
}

const parentEntityConfiguration = new EntityConfiguration<ParentFields>({
  idField: 'id',
  tableName: 'parents',
  getInboundEdges: () => [ChildEntity],
  schema: {
    id: new UUIDField({
      columnName: 'id',
      cache: true,
    }),
  },
  databaseAdapterFlavor: 'postgres',
  cacheAdapterFlavor: 'redis',
});

const parentEntityCompanion = new EntityCompanionDefinition({
  entityClass: ParentEntity,
  entityConfiguration: parentEntityConfiguration,
  privacyPolicyClass: TestEntityPrivacyPolicy,
});

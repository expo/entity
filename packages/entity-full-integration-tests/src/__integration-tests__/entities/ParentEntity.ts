import {
  AlwaysAllowPrivacyPolicyRule,
  CacheAdapterFlavor,
  DatabaseAdapterFlavor,
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
  protected readonly readRules = [new AlwaysAllowPrivacyPolicyRule()];
  protected readonly createRules = [new AlwaysAllowPrivacyPolicyRule()];
  protected readonly updateRules = [new AlwaysAllowPrivacyPolicyRule()];
  protected readonly deleteRules = [new AlwaysAllowPrivacyPolicyRule()];
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
  inboundEdges: [ChildEntity],
  schema: {
    id: new UUIDField({
      columnName: 'id',
      cache: true,
    }),
  },
  databaseAdapterFlavor: DatabaseAdapterFlavor.POSTGRES,
  cacheAdapterFlavor: CacheAdapterFlavor.REDIS,
});

const parentEntityCompanion = new EntityCompanionDefinition({
  entityClass: ParentEntity,
  entityConfiguration: parentEntityConfiguration,
  privacyPolicyClass: TestEntityPrivacyPolicy,
});

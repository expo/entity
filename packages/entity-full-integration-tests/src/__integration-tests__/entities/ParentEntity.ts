import type { EntityCompanionDefinition, ViewerContext } from '@expo/entity';
import {
  AlwaysAllowPrivacyPolicyRule,
  Entity,
  EntityConfiguration,
  EntityPrivacyPolicy,
  UUIDField,
} from '@expo/entity';

import ChildEntity from './ChildEntity.ts';

interface ParentFields {
  id: string;
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

export default class ParentEntity extends Entity<ParentFields, 'id', ViewerContext> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    ParentFields,
    'id',
    ViewerContext,
    ParentEntity,
    TestEntityPrivacyPolicy
  > {
    return {
      entityClass: ParentEntity,
      entityConfiguration: new EntityConfiguration<ParentFields, 'id'>({
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

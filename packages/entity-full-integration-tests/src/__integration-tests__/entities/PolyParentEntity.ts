import type { EntityCompanionDefinition, ViewerContext } from '@expo/entity';
import {
  AlwaysAllowPrivacyPolicyRule,
  Entity,
  EntityConfiguration,
  EntityPrivacyPolicy,
  UUIDField,
} from '@expo/entity';

import ScopeAChildEntity from './ScopeAChildEntity.ts';
import ScopeBChildEntity from './ScopeBChildEntity.ts';

interface PolyParentFields {
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

export default class PolyParentEntity extends Entity<PolyParentFields, 'id', ViewerContext> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    PolyParentFields,
    'id',
    ViewerContext,
    PolyParentEntity,
    TestEntityPrivacyPolicy
  > {
    return {
      entityClass: PolyParentEntity,
      entityConfiguration: new EntityConfiguration<PolyParentFields, 'id'>({
        idField: 'id',
        tableName: 'poly_parents',
        inboundEdges: [ScopeAChildEntity, ScopeBChildEntity],
        schema: {
          id: new UUIDField({ columnName: 'id', cache: true }),
        },
        databaseAdapterFlavor: 'postgres',
        cacheAdapterFlavor: 'redis',
      }),
      privacyPolicyClass: TestEntityPrivacyPolicy,
    };
  }
}

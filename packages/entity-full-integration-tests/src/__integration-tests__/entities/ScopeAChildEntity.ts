import type { EntityCompanionDefinition, ViewerContext } from '@expo/entity';
import {
  AlwaysAllowPrivacyPolicyRule,
  Entity,
  EntityConfiguration,
  EntityEdgeDeletionBehavior,
  EntityPrivacyPolicy,
  StringField,
  UUIDField,
} from '@expo/entity';

import PolyParentEntity from './PolyParentEntity.ts';

interface PolyChildFields {
  id: string;
  parent_id: string;
  scope: 'A' | 'B';
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

export default class ScopeAChildEntity extends Entity<PolyChildFields, 'id', ViewerContext> {
  constructor(constructorParams: {
    viewerContext: ViewerContext;
    id: string;
    databaseFields: Readonly<PolyChildFields>;
    selectedFields: Readonly<Pick<PolyChildFields, keyof PolyChildFields>>;
  }) {
    if (constructorParams.databaseFields.scope !== 'A') {
      throw new Error(
        `ScopeAChildEntity requires scope='A', got '${constructorParams.databaseFields.scope}'`,
      );
    }
    super(constructorParams);
  }

  static defineCompanionDefinition(): EntityCompanionDefinition<
    PolyChildFields,
    'id',
    ViewerContext,
    ScopeAChildEntity,
    TestEntityPrivacyPolicy
  > {
    return {
      entityClass: ScopeAChildEntity,
      entityConfiguration: new EntityConfiguration<PolyChildFields, 'id'>({
        idField: 'id',
        tableName: 'poly_children',
        inherentFilters: [{ fieldName: 'scope', fieldValue: 'A' }],
        schema: {
          id: new UUIDField({ columnName: 'id', cache: true }),
          parent_id: new UUIDField({
            columnName: 'parent_id',
            association: {
              associatedEntityClass: PolyParentEntity,
              edgeDeletionBehavior: EntityEdgeDeletionBehavior.CASCADE_DELETE,
            },
          }),
          scope: new StringField({ columnName: 'scope' }),
        },
        databaseAdapterFlavor: 'postgres',
        cacheAdapterFlavor: 'redis',
      }),
      privacyPolicyClass: TestEntityPrivacyPolicy,
    };
  }
}

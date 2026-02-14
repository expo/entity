import {
  EntityCompanionDefinition,
  EntityConfiguration,
  EntityPrivacyPolicy,
  ViewerContext,
  EntityPrivacyPolicyEvaluationContext,
  EntityQueryContext,
  UUIDField,
  StringField,
  DateField,
  IntField,
  RuleEvaluationResult,
} from '@expo/entity';

import { PostgresEntity } from '../../PostgresEntity';

export interface TestPaginationFields {
  id: string;
  name: string;
  status: string;
  createdAt: Date;
  score: number;
}

export const testPaginationEntityConfiguration = new EntityConfiguration<
  TestPaginationFields,
  'id'
>({
  idField: 'id',
  tableName: 'test_pagination_entities',
  schema: {
    id: new UUIDField({
      columnName: 'id',
      cache: true,
    }),
    name: new StringField({
      columnName: 'name',
    }),
    status: new StringField({
      columnName: 'status',
    }),
    createdAt: new DateField({
      columnName: 'created_at',
    }),
    score: new IntField({
      columnName: 'score',
    }),
  },
  databaseAdapterFlavor: 'postgres',
  cacheAdapterFlavor: 'redis',
});

/**
 * Privacy policy that conditionally fails authorization based on the 'status' field.
 * Entities with status 'unauthorized' will fail authorization.
 */
export class TestPaginationPrivacyPolicy extends EntityPrivacyPolicy<
  TestPaginationFields,
  'id',
  ViewerContext,
  TestPaginationEntity
> {
  protected override readonly readRules = [
    {
      async evaluateAsync(
        _viewerContext: ViewerContext,
        _queryContext: EntityQueryContext,
        _evaluationContext: EntityPrivacyPolicyEvaluationContext<
          TestPaginationFields,
          'id',
          ViewerContext,
          TestPaginationEntity
        >,
        entity: TestPaginationEntity,
      ): Promise<RuleEvaluationResult> {
        // Fail authorization for entities with status 'unauthorized'
        return entity.getField('status') === 'unauthorized'
          ? RuleEvaluationResult.DENY
          : RuleEvaluationResult.ALLOW;
      },
    },
  ];

  protected override readonly createRules = [];
  protected override readonly updateRules = [];
  protected override readonly deleteRules = [];
}

export class TestPaginationEntity extends PostgresEntity<
  TestPaginationFields,
  'id',
  ViewerContext
> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    TestPaginationFields,
    'id',
    ViewerContext,
    TestPaginationEntity,
    TestPaginationPrivacyPolicy
  > {
    return {
      entityClass: TestPaginationEntity,
      entityConfiguration: testPaginationEntityConfiguration,
      privacyPolicyClass: TestPaginationPrivacyPolicy,
    };
  }
}

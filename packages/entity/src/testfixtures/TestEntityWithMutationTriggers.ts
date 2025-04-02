import Entity from '../Entity';
import { EntityCompanionDefinition } from '../EntityCompanionProvider';
import EntityConfiguration from '../EntityConfiguration';
import { StringField, UUIDField } from '../EntityFields';
import { EntityTriggerMutationInfo } from '../EntityMutationInfo';
import {
  EntityMutationTrigger,
  EntityNonTransactionalMutationTrigger,
} from '../EntityMutationTriggerConfiguration';
import EntityPrivacyPolicy from '../EntityPrivacyPolicy';
import { EntityQueryContext } from '../EntityQueryContext';
import ViewerContext from '../ViewerContext';
import AlwaysAllowPrivacyPolicyRule from '../rules/AlwaysAllowPrivacyPolicyRule';

export type TestMTFields = {
  id: string;
  stringField: string;
};

export const testEntityMTConfiguration = new EntityConfiguration<TestMTFields, 'id'>({
  idField: 'id',
  tableName: 'test_entity_should_not_write_to_db_3',
  schema: {
    id: new UUIDField({
      columnName: 'id',
      cache: false,
    }),
    stringField: new StringField({
      columnName: 'string_field',
    }),
  },
  databaseAdapterFlavor: 'postgres',
  cacheAdapterFlavor: 'redis',
});

export class TestEntityMTPrivacyPolicy extends EntityPrivacyPolicy<
  TestMTFields,
  'id',
  ViewerContext,
  TestEntityWithMutationTriggers
> {
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<
      TestMTFields,
      'id',
      ViewerContext,
      TestEntityWithMutationTriggers
    >(),
  ];
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<
      TestMTFields,
      'id',
      ViewerContext,
      TestEntityWithMutationTriggers
    >(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<
      TestMTFields,
      'id',
      ViewerContext,
      TestEntityWithMutationTriggers
    >(),
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<
      TestMTFields,
      'id',
      ViewerContext,
      TestEntityWithMutationTriggers
    >(),
  ];
}

export class TestMutationTrigger extends EntityMutationTrigger<
  TestMTFields,
  'id',
  ViewerContext,
  TestEntityWithMutationTriggers,
  keyof TestMTFields
> {
  constructor(
    // @ts-expect-error key is never used but is helpful for debugging
    private readonly key: string,
  ) {
    super();
  }

  async executeAsync(
    _viewerContext: ViewerContext,
    _queryContext: EntityQueryContext,
    _entity: TestEntityWithMutationTriggers,
    _mutationInfo: EntityTriggerMutationInfo<
      TestMTFields,
      'id',
      ViewerContext,
      TestEntityWithMutationTriggers,
      keyof TestMTFields
    >,
  ): Promise<void> {}
}

export class NonTransactionalTestMutationTrigger extends EntityNonTransactionalMutationTrigger<
  TestMTFields,
  'id',
  ViewerContext,
  TestEntityWithMutationTriggers,
  keyof TestMTFields
> {
  constructor(
    // @ts-expect-error key is never used but is helpful for debugging
    private readonly key: string,
  ) {
    super();
  }

  async executeAsync(
    _viewerContext: ViewerContext,
    _entity: TestEntityWithMutationTriggers,
    _mutationInfo: EntityTriggerMutationInfo<
      TestMTFields,
      'id',
      ViewerContext,
      TestEntityWithMutationTriggers,
      keyof TestMTFields
    >,
  ): Promise<void> {}
}

/**
 * A test Entity that has one afterCreate and one afterAll trigger
 */
export default class TestEntityWithMutationTriggers extends Entity<
  TestMTFields,
  'id',
  ViewerContext
> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    TestMTFields,
    'id',
    ViewerContext,
    TestEntityWithMutationTriggers,
    TestEntityMTPrivacyPolicy
  > {
    return {
      entityClass: TestEntityWithMutationTriggers,
      entityConfiguration: testEntityMTConfiguration,
      privacyPolicyClass: TestEntityMTPrivacyPolicy,
      mutationTriggers: {
        afterCreate: [new TestMutationTrigger('localAfterCreate')],
        afterAll: [new TestMutationTrigger('localAfterAll')],
        afterCommit: [new NonTransactionalTestMutationTrigger('localAfterCommit')],
      },
    };
  }
}

import {
  AlwaysAllowPrivacyPolicyRule,
  EntityPrivacyPolicy,
  ViewerContext,
  UUIDField,
  StringField,
  EntityConfiguration,
  EntityCompanionDefinition,
  Entity,
  EntityMutationTrigger,
  EntityQueryContext,
  EntityNonTransactionalMutationTrigger,
  EntityTriggerMutationInfo,
} from '@expo/entity';
import { Knex } from 'knex';

type PostgresTriggerTestEntityFields = {
  id: string;
  name: string | null;
};

export default class PostgresTriggerTestEntity extends Entity<
  PostgresTriggerTestEntityFields,
  string,
  ViewerContext
> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    PostgresTriggerTestEntityFields,
    string,
    ViewerContext,
    PostgresTriggerTestEntity,
    PostgresTriggerTestEntityPrivacyPolicy
  > {
    return {
      entityClass: PostgresTriggerTestEntity,
      entityConfiguration: postgresTestEntityConfiguration,
      privacyPolicyClass: PostgresTriggerTestEntityPrivacyPolicy,
      mutationTriggers: {
        beforeCreate: [new ThrowConditionallyTrigger('name', 'beforeCreate')],
        afterCreate: [new ThrowConditionallyTrigger('name', 'afterCreate')],
        beforeUpdate: [new ThrowConditionallyTrigger('name', 'beforeUpdate')],
        afterUpdate: [new ThrowConditionallyTrigger('name', 'afterUpdate')],
        beforeDelete: [new ThrowConditionallyTrigger('name', 'beforeDelete')],
        afterDelete: [new ThrowConditionallyTrigger('name', 'afterDelete')],
        beforeAll: [new ThrowConditionallyTrigger('name', 'beforeAll')],
        afterAll: [new ThrowConditionallyTrigger('name', 'afterAll')],
        afterCommit: [new ThrowConditionallyNonTransactionalTrigger('name', 'afterCommit')],
      },
    };
  }

  public static async createOrTruncatePostgresTableAsync(knex: Knex): Promise<void> {
    const tableName = 'postgres_test_entities';
    const hasTable = await knex.schema.hasTable(tableName);
    if (!hasTable) {
      await knex.schema.createTable(tableName, (table) => {
        table.uuid('id').defaultTo(knex.raw('gen_random_uuid()')).primary();
        table.string('name');
      });
    }
    await knex.into(tableName).truncate();
  }

  public static async dropPostgresTableAsync(knex: Knex): Promise<void> {
    const tableName = 'postgres_test_entities';
    const hasTable = await knex.schema.hasTable(tableName);
    if (hasTable) {
      await knex.schema.dropTable(tableName);
    }
  }
}

class PostgresTriggerTestEntityPrivacyPolicy extends EntityPrivacyPolicy<
  PostgresTriggerTestEntityFields,
  string,
  ViewerContext,
  PostgresTriggerTestEntity
> {
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<
      PostgresTriggerTestEntityFields,
      string,
      ViewerContext,
      PostgresTriggerTestEntity
    >(),
  ];
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<
      PostgresTriggerTestEntityFields,
      string,
      ViewerContext,
      PostgresTriggerTestEntity
    >(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<
      PostgresTriggerTestEntityFields,
      string,
      ViewerContext,
      PostgresTriggerTestEntity
    >(),
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<
      PostgresTriggerTestEntityFields,
      string,
      ViewerContext,
      PostgresTriggerTestEntity
    >(),
  ];
}

class ThrowConditionallyTrigger extends EntityMutationTrigger<
  PostgresTriggerTestEntityFields,
  string,
  ViewerContext,
  PostgresTriggerTestEntity
> {
  constructor(
    private readonly fieldName: keyof PostgresTriggerTestEntityFields,
    private readonly badValue: string,
  ) {
    super();
  }

  async executeAsync(
    _viewerContext: ViewerContext,
    _queryContext: EntityQueryContext,
    entity: PostgresTriggerTestEntity,
    _mutationInfo: EntityTriggerMutationInfo<
      PostgresTriggerTestEntityFields,
      string,
      ViewerContext,
      PostgresTriggerTestEntity
    >,
  ): Promise<void> {
    if (entity.getField(this.fieldName) === this.badValue) {
      throw new Error(`${this.fieldName} cannot have value ${this.badValue}`);
    }
  }
}

class ThrowConditionallyNonTransactionalTrigger extends EntityNonTransactionalMutationTrigger<
  PostgresTriggerTestEntityFields,
  string,
  ViewerContext,
  PostgresTriggerTestEntity
> {
  constructor(
    private readonly fieldName: keyof PostgresTriggerTestEntityFields,
    private readonly badValue: string,
  ) {
    super();
  }

  async executeAsync(
    _viewerContext: ViewerContext,
    entity: PostgresTriggerTestEntity,
  ): Promise<void> {
    if (entity.getField(this.fieldName) === this.badValue) {
      throw new Error(`${this.fieldName} cannot have value ${this.badValue}`);
    }
  }
}

export const postgresTestEntityConfiguration =
  new EntityConfiguration<PostgresTriggerTestEntityFields>({
    idField: 'id',
    tableName: 'postgres_test_entities',
    schema: {
      id: new UUIDField({
        columnName: 'id',
        cache: true,
      }),
      name: new StringField({
        columnName: 'name',
      }),
    },
    databaseAdapterFlavor: 'postgres',
    cacheAdapterFlavor: 'redis',
  });

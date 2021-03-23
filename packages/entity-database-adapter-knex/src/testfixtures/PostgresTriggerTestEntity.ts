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
} from '@expo/entity';
import Knex from 'knex';

type PostgresTriggerTestEntityFields = {
  id: string;
  name: string | null;
};

export default class PostgresTriggerTestEntity extends Entity<
  PostgresTriggerTestEntityFields,
  string,
  ViewerContext
> {
  static getCompanionDefinition(): EntityCompanionDefinition<
    PostgresTriggerTestEntityFields,
    string,
    ViewerContext,
    PostgresTriggerTestEntity,
    PostgresTriggerTestEntityPrivacyPolicy
  > {
    return postgresTestEntityCompanionDefinition;
  }

  public static async createOrTruncatePostgresTable(knex: Knex): Promise<void> {
    await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"'); // for uuid_generate_v4()

    const tableName = this.getCompanionDefinition().entityConfiguration.tableName;
    const hasTable = await knex.schema.hasTable(tableName);
    if (!hasTable) {
      await knex.schema.createTable(tableName, (table) => {
        table.uuid('id').defaultTo(knex.raw('uuid_generate_v4()')).primary();
        table.string('name');
      });
    }
    await knex.into(tableName).truncate();
  }

  public static async dropPostgresTable(knex: Knex): Promise<void> {
    const tableName = this.getCompanionDefinition().entityConfiguration.tableName;
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
  protected readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<
      PostgresTriggerTestEntityFields,
      string,
      ViewerContext,
      PostgresTriggerTestEntity
    >(),
  ];
  protected readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<
      PostgresTriggerTestEntityFields,
      string,
      ViewerContext,
      PostgresTriggerTestEntity
    >(),
  ];
  protected readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<
      PostgresTriggerTestEntityFields,
      string,
      ViewerContext,
      PostgresTriggerTestEntity
    >(),
  ];
  protected readonly deleteRules = [
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
  constructor(private fieldName: keyof PostgresTriggerTestEntityFields, private badValue: string) {
    super();
  }

  async executeAsync(
    _viewerContext: ViewerContext,
    _queryContext: EntityQueryContext,
    entity: PostgresTriggerTestEntity
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
  constructor(private fieldName: keyof PostgresTriggerTestEntityFields, private badValue: string) {
    super();
  }

  async executeAsync(
    _viewerContext: ViewerContext,
    entity: PostgresTriggerTestEntity
  ): Promise<void> {
    if (entity.getField(this.fieldName) === this.badValue) {
      throw new Error(`${this.fieldName} cannot have value ${this.badValue}`);
    }
  }
}

export const postgresTestEntityConfiguration = new EntityConfiguration<
  PostgresTriggerTestEntityFields
>({
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

const postgresTestEntityCompanionDefinition = new EntityCompanionDefinition({
  entityClass: PostgresTriggerTestEntity,
  entityConfiguration: postgresTestEntityConfiguration,
  privacyPolicyClass: PostgresTriggerTestEntityPrivacyPolicy,
  mutationTriggers: () => ({
    beforeCreate: [new ThrowConditionallyTrigger('name', 'beforeCreate')],
    afterCreate: [new ThrowConditionallyTrigger('name', 'afterCreate')],
    beforeUpdate: [new ThrowConditionallyTrigger('name', 'beforeUpdate')],
    afterUpdate: [new ThrowConditionallyTrigger('name', 'afterUpdate')],
    beforeDelete: [new ThrowConditionallyTrigger('name', 'beforeDelete')],
    afterDelete: [new ThrowConditionallyTrigger('name', 'afterDelete')],
    beforeAll: [new ThrowConditionallyTrigger('name', 'beforeAll')],
    afterAll: [new ThrowConditionallyTrigger('name', 'afterAll')],
    afterCommit: [new ThrowConditionallyNonTransactionalTrigger('name', 'afterCommit')],
  }),
});

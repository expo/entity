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
  EntityValidatorMutationInfo,
} from '@expo/entity';
import { Knex } from 'knex';

type PostgresValidatorTestEntityFields = {
  id: string;
  name: string | null;
};

export default class PostgresValidatorTestEntity extends Entity<
  PostgresValidatorTestEntityFields,
  string,
  ViewerContext
> {
  static getCompanionDefinition(): EntityCompanionDefinition<
    PostgresValidatorTestEntityFields,
    string,
    ViewerContext,
    PostgresValidatorTestEntity,
    PostgresValidatorTestEntityPrivacyPolicy
  > {
    return postgresTestEntityCompanionDefinition;
  }

  public static async createOrTruncatePostgresTable(knex: Knex): Promise<void> {
    const tableName = this.getCompanionDefinition().entityConfiguration.tableName;
    const hasTable = await knex.schema.hasTable(tableName);
    if (!hasTable) {
      await knex.schema.createTable(tableName, (table) => {
        table.uuid('id').defaultTo(knex.raw('gen_random_uuid()')).primary();
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

class PostgresValidatorTestEntityPrivacyPolicy extends EntityPrivacyPolicy<
  PostgresValidatorTestEntityFields,
  string,
  ViewerContext,
  PostgresValidatorTestEntity
> {
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<
      PostgresValidatorTestEntityFields,
      string,
      ViewerContext,
      PostgresValidatorTestEntity
    >(),
  ];
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<
      PostgresValidatorTestEntityFields,
      string,
      ViewerContext,
      PostgresValidatorTestEntity
    >(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<
      PostgresValidatorTestEntityFields,
      string,
      ViewerContext,
      PostgresValidatorTestEntity
    >(),
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<
      PostgresValidatorTestEntityFields,
      string,
      ViewerContext,
      PostgresValidatorTestEntity
    >(),
  ];
}

class ThrowConditionallyTrigger extends EntityMutationTrigger<
  PostgresValidatorTestEntityFields,
  string,
  ViewerContext,
  PostgresValidatorTestEntity
> {
  constructor(
    private fieldName: keyof PostgresValidatorTestEntityFields,
    private badValue: string
  ) {
    super();
  }

  async executeAsync(
    _viewerContext: ViewerContext,
    _queryContext: EntityQueryContext,
    entity: PostgresValidatorTestEntity,
    _mutationInfo: EntityValidatorMutationInfo<
      PostgresValidatorTestEntityFields,
      string,
      ViewerContext,
      PostgresValidatorTestEntity
    >
  ): Promise<void> {
    if (entity.getField(this.fieldName) === this.badValue) {
      throw new Error(`${this.fieldName} cannot have value ${this.badValue}`);
    }
  }
}

export const postgresTestEntityConfiguration =
  new EntityConfiguration<PostgresValidatorTestEntityFields>({
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
  entityClass: PostgresValidatorTestEntity,
  entityConfiguration: postgresTestEntityConfiguration,
  privacyPolicyClass: PostgresValidatorTestEntityPrivacyPolicy,
  mutationValidators: () => [new ThrowConditionallyTrigger('name', 'beforeCreateAndBeforeUpdate')],
});

import {
  AlwaysAllowPrivacyPolicyRule,
  EntityPrivacyPolicy,
  ViewerContext,
  UUIDField,
  StringField,
  EntityConfiguration,
  EntityCompanionDefinition,
  Entity,
} from '@expo/entity';
import { Knex } from 'knex';

type PostgresUniqueTestEntityFields = {
  id: string;
  name: string | null;
};

export default class PostgresUniqueTestEntity extends Entity<
  PostgresUniqueTestEntityFields,
  string,
  ViewerContext
> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    PostgresUniqueTestEntityFields,
    string,
    ViewerContext,
    PostgresUniqueTestEntity,
    PostgresUniqueTestEntityPrivacyPolicy
  > {
    return {
      entityClass: PostgresUniqueTestEntity,
      entityConfiguration: postgresTestEntityConfiguration,
      privacyPolicyClass: PostgresUniqueTestEntityPrivacyPolicy,
    };
  }

  public static async createOrTruncatePostgresTableAsync(knex: Knex): Promise<void> {
    const tableName = 'postgres_test_entities';
    const hasTable = await knex.schema.hasTable(tableName);
    if (!hasTable) {
      await knex.schema.createTable(tableName, (table) => {
        table.uuid('id').defaultTo(knex.raw('gen_random_uuid()')).primary();
        table.string('name').unique();
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

class PostgresUniqueTestEntityPrivacyPolicy extends EntityPrivacyPolicy<
  PostgresUniqueTestEntityFields,
  string,
  ViewerContext,
  PostgresUniqueTestEntity
> {
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<
      PostgresUniqueTestEntityFields,
      string,
      ViewerContext,
      PostgresUniqueTestEntity
    >(),
  ];
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<
      PostgresUniqueTestEntityFields,
      string,
      ViewerContext,
      PostgresUniqueTestEntity
    >(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<
      PostgresUniqueTestEntityFields,
      string,
      ViewerContext,
      PostgresUniqueTestEntity
    >(),
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<
      PostgresUniqueTestEntityFields,
      string,
      ViewerContext,
      PostgresUniqueTestEntity
    >(),
  ];
}

export const postgresTestEntityConfiguration =
  new EntityConfiguration<PostgresUniqueTestEntityFields>({
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

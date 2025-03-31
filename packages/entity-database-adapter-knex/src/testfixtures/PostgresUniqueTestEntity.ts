import {
  AlwaysAllowPrivacyPolicyRule,
  EntityPrivacyPolicy,
  ViewerContext,
  StringField,
  EntityConfiguration,
  EntityCompanionDefinition,
  Entity,
  UUIDField,
} from '@expo/entity';
import { Knex } from 'knex';

type PostgresUniqueTestEntityFields = {
  id: string;
  name: string | null;
};

export default class PostgresUniqueTestEntity extends Entity<
  PostgresUniqueTestEntityFields,
  'id',
  ViewerContext
> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    PostgresUniqueTestEntityFields,
    'id',
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
  'id',
  ViewerContext,
  PostgresUniqueTestEntity
> {
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<
      PostgresUniqueTestEntityFields,
      'id',
      ViewerContext,
      PostgresUniqueTestEntity
    >(),
  ];
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<
      PostgresUniqueTestEntityFields,
      'id',
      ViewerContext,
      PostgresUniqueTestEntity
    >(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<
      PostgresUniqueTestEntityFields,
      'id',
      ViewerContext,
      PostgresUniqueTestEntity
    >(),
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<
      PostgresUniqueTestEntityFields,
      'id',
      ViewerContext,
      PostgresUniqueTestEntity
    >(),
  ];
}

export const postgresTestEntityConfiguration = new EntityConfiguration<
  PostgresUniqueTestEntityFields,
  'id'
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

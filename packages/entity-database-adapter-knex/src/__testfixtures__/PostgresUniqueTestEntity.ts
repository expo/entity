import {
  AlwaysAllowPrivacyPolicyRule,
  Entity,
  EntityCompanionDefinition,
  EntityConfiguration,
  EntityPrivacyPolicy,
  EntityTransactionalQueryContext,
  StringField,
  UUIDField,
  ViewerContext,
} from '@expo/entity';
import { Knex } from 'knex';

type PostgresUniqueTestEntityFields = {
  id: string;
  name: string | null;
};

export class PostgresUniqueTestEntity extends Entity<
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

  public static async getByNameAsync(
    viewerContext: ViewerContext,
    args: { name: string },
    queryContext?: EntityTransactionalQueryContext,
  ): Promise<PostgresUniqueTestEntity | null> {
    return await PostgresUniqueTestEntity.loader(
      viewerContext,
      queryContext,
    ).loadByFieldEqualingAsync('name', args.name);
  }

  public static async createWithNameAsync(
    viewerContext: ViewerContext,
    args: { name: string },
    queryContext?: EntityTransactionalQueryContext,
  ): Promise<PostgresUniqueTestEntity> {
    return await PostgresUniqueTestEntity.creator(viewerContext, queryContext)
      .setField('name', args.name)
      .createAsync();
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
      cache: true,
    }),
  },
  databaseAdapterFlavor: 'postgres',
  cacheAdapterFlavor: 'redis',
});

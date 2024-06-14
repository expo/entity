import {
  AlwaysAllowPrivacyPolicyRule,
  EntityPrivacyPolicy,
  ViewerContext,
  StringField,
  EntityConfiguration,
  EntityCompanionDefinition,
  Entity,
  IntField,
} from '@expo/entity';
import { Knex } from 'knex';

type InvalidTestEntityFields = {
  id: number;
  name: string | null;
};

export default class InvalidTestEntity extends Entity<
  InvalidTestEntityFields,
  number,
  ViewerContext
> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    InvalidTestEntityFields,
    number,
    ViewerContext,
    InvalidTestEntity,
    InvalidTestEntityPrivacyPolicy
  > {
    return {
      entityClass: InvalidTestEntity,
      entityConfiguration: invalidTestEntityConfiguration,
      privacyPolicyClass: InvalidTestEntityPrivacyPolicy,
    };
  }

  public static async createOrTruncatePostgresTableAsync(knex: Knex): Promise<void> {
    const tableName = 'postgres_test_entities';
    const hasTable = await knex.schema.hasTable(tableName);
    if (!hasTable) {
      await knex.schema.createTable(tableName, (table) => {
        table.integer('id'); // invalid because ID is not a primary key or unique
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

class InvalidTestEntityPrivacyPolicy extends EntityPrivacyPolicy<
  InvalidTestEntityFields,
  number,
  ViewerContext,
  InvalidTestEntity
> {
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<
      InvalidTestEntityFields,
      number,
      ViewerContext,
      InvalidTestEntity
    >(),
  ];
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<
      InvalidTestEntityFields,
      number,
      ViewerContext,
      InvalidTestEntity
    >(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<
      InvalidTestEntityFields,
      number,
      ViewerContext,
      InvalidTestEntity
    >(),
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<
      InvalidTestEntityFields,
      number,
      ViewerContext,
      InvalidTestEntity
    >(),
  ];
}

export const invalidTestEntityConfiguration = new EntityConfiguration<InvalidTestEntityFields>({
  idField: 'id',
  tableName: 'postgres_test_entities',
  schema: {
    id: new IntField({
      columnName: 'id',
    }),
    name: new StringField({
      columnName: 'name',
    }),
  },
  databaseAdapterFlavor: 'postgres',
  cacheAdapterFlavor: 'redis',
});

import {
  AlwaysAllowPrivacyPolicyRule,
  EntityPrivacyPolicy,
  ViewerContext,
  UUIDField,
  StringField,
  BooleanField,
  StringArrayField,
  JSONObjectField,
  DateField,
  EntityConfiguration,
  EntityCompanionDefinition,
  Entity,
} from '@expo/entity';
import { Knex } from 'knex';

import { BigIntField, JSONArrayField, MaybeJSONArrayField } from '../EntityFields';

type PostgresTestEntityFields = {
  id: string;
  name: string | null;
  hasADog: boolean | null;
  hasACat: boolean | null;
  stringArray: string[] | null;
  jsonArrayField: string[] | null;
  jsonObjectField: {
    hello: string;
  } | null;
  dateField: Date | null;
  maybeJsonArrayField: string[] | { hello: string } | null;
  bigintField: string | null;
};

export default class PostgresTestEntity extends Entity<
  PostgresTestEntityFields,
  string,
  ViewerContext
> {
  static getCompanionDefinition(): EntityCompanionDefinition<
    PostgresTestEntityFields,
    string,
    ViewerContext,
    PostgresTestEntity,
    PostgresTestEntityPrivacyPolicy
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
        table.boolean('has_a_dog');
        table.boolean('has_a_cat');
        table.specificType('string_array', 'text[]');
        table.jsonb('json_array_field');
        table.jsonb('json_object_field');
        table.dateTime('date_field', { useTz: true });
        table.jsonb('maybe_json_array_field');
        table.bigint('bigint_field');
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

class PostgresTestEntityPrivacyPolicy extends EntityPrivacyPolicy<
  PostgresTestEntityFields,
  string,
  ViewerContext,
  PostgresTestEntity
> {
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<
      PostgresTestEntityFields,
      string,
      ViewerContext,
      PostgresTestEntity
    >(),
  ];
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<
      PostgresTestEntityFields,
      string,
      ViewerContext,
      PostgresTestEntity
    >(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<
      PostgresTestEntityFields,
      string,
      ViewerContext,
      PostgresTestEntity
    >(),
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<
      PostgresTestEntityFields,
      string,
      ViewerContext,
      PostgresTestEntity
    >(),
  ];
}

export const postgresTestEntityConfiguration = new EntityConfiguration<PostgresTestEntityFields>({
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
    hasADog: new BooleanField({
      columnName: 'has_a_dog',
    }),
    hasACat: new BooleanField({
      columnName: 'has_a_cat',
    }),
    stringArray: new StringArrayField({
      columnName: 'string_array',
    }),
    jsonArrayField: new JSONArrayField({
      columnName: 'json_array_field',
    }),
    jsonObjectField: new JSONObjectField({
      columnName: 'json_object_field',
    }),
    dateField: new DateField({
      columnName: 'date_field',
    }),
    maybeJsonArrayField: new MaybeJSONArrayField({
      columnName: 'maybe_json_array_field',
    }),
    bigintField: new BigIntField({
      columnName: 'bigint_field',
    }),
  },
  databaseAdapterFlavor: 'postgres',
  cacheAdapterFlavor: 'redis',
});

const postgresTestEntityCompanionDefinition = new EntityCompanionDefinition({
  entityClass: PostgresTestEntity,
  entityConfiguration: postgresTestEntityConfiguration,
  privacyPolicyClass: PostgresTestEntityPrivacyPolicy,
});

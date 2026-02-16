import {
  AlwaysAllowPrivacyPolicyRule,
  BooleanField,
  DateField,
  EntityCompanionDefinition,
  EntityConfiguration,
  EntityPrivacyPolicy,
  JSONObjectField,
  StringArrayField,
  StringField,
  UUIDField,
  ViewerContext,
  BufferField,
} from '@expo/entity';
import { Knex } from 'knex';

import { BigIntField, JSONArrayField, MaybeJSONArrayField } from '../EntityFields';
import { PostgresEntity } from '../PostgresEntity';

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
  binaryField: Buffer | null;
  createdAt: Date;
};

export class PostgresTestEntity extends PostgresEntity<
  PostgresTestEntityFields,
  'id',
  ViewerContext
> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    PostgresTestEntityFields,
    'id',
    ViewerContext,
    PostgresTestEntity,
    PostgresTestEntityPrivacyPolicy
  > {
    return {
      entityClass: PostgresTestEntity,
      entityConfiguration: postgresTestEntityConfiguration,
      privacyPolicyClass: PostgresTestEntityPrivacyPolicy,
    };
  }

  public static async createOrTruncatePostgresTableAsync(knex: Knex): Promise<void> {
    const tableName = 'postgres_test_entities';
    const hasTable = await knex.schema.hasTable(tableName);
    if (!hasTable) {
      await knex.schema.createTable(tableName, (table) => {
        table.uuid('id').defaultTo(knex.raw('gen_random_uuid()')).primary();
        table.string('name');
        table.boolean('has_a_dog');
        table.boolean('has_a_cat');
        table.specificType('string_array', 'text[]');
        table.jsonb('json_array_field');
        table.jsonb('json_object_field');
        table.dateTime('date_field', { useTz: true });
        table.jsonb('maybe_json_array_field');
        table.bigint('bigint_field');
        table.binary('binary_field');
        table.dateTime('created_at', { useTz: true }).defaultTo(knex.fn.now());
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

class PostgresTestEntityPrivacyPolicy extends EntityPrivacyPolicy<
  PostgresTestEntityFields,
  'id',
  ViewerContext,
  PostgresTestEntity
> {
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<
      PostgresTestEntityFields,
      'id',
      ViewerContext,
      PostgresTestEntity
    >(),
  ];
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<
      PostgresTestEntityFields,
      'id',
      ViewerContext,
      PostgresTestEntity
    >(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<
      PostgresTestEntityFields,
      'id',
      ViewerContext,
      PostgresTestEntity
    >(),
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<
      PostgresTestEntityFields,
      'id',
      ViewerContext,
      PostgresTestEntity
    >(),
  ];
}

export const postgresTestEntityConfiguration = new EntityConfiguration<
  PostgresTestEntityFields,
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
    binaryField: new BufferField({
      columnName: 'binary_field',
    }),
    createdAt: new DateField({
      columnName: 'created_at',
    }),
  },
  databaseAdapterFlavor: 'postgres',
  cacheAdapterFlavor: 'redis',
  compositeFieldDefinitions: [{ compositeField: ['hasACat', 'hasADog'], cache: false }],
});

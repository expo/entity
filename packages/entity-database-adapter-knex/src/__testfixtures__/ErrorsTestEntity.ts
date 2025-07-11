import {
  AlwaysAllowPrivacyPolicyRule,
  Entity,
  EntityCompanionDefinition,
  EntityConfiguration,
  EntityPrivacyPolicy,
  IntField,
  StringField,
  ViewerContext,
} from '@expo/entity';
import { Knex } from 'knex';

type ErrorsTestEntityFields = {
  id: number;
  fieldNonNull: string;
  fieldForeignKey: number | null;
  fieldUnique: string | null;
  checkLessThan5: number | null;
  fieldExclusion: string | null;
  nonExistentColumn: string | null;
};

const foreignTableName = 'foreign_table';

export class ErrorsTestEntity extends Entity<ErrorsTestEntityFields, 'id', ViewerContext> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    ErrorsTestEntityFields,
    'id',
    ViewerContext,
    ErrorsTestEntity,
    ErrorsTestEntityPrivacyPolicy
  > {
    return {
      entityClass: ErrorsTestEntity,
      entityConfiguration: ErrorsTestEntityConfiguration,
      privacyPolicyClass: ErrorsTestEntityPrivacyPolicy,
    };
  }

  public static async createOrTruncatePostgresTableAsync(knex: Knex): Promise<void> {
    await knex.raw('CREATE EXTENSION IF NOT EXISTS "btree_gist"'); // for gist exclusion on varchar

    const tableName = 'postgres_test_entities';
    const hasForeignTable = await knex.schema.hasTable(foreignTableName);
    if (!hasForeignTable) {
      await knex.schema.createTable(foreignTableName, (table) => {
        table.integer('id').primary();
      });
    }

    const hasTable = await knex.schema.hasTable(tableName);
    if (!hasTable) {
      await knex.schema.createTable(tableName, (table) => {
        table.integer('id').primary();
        table.string('field_non_null').notNullable();
        table.integer('field_foreign_key').references(`${foreignTableName}.id`);
        table.string('field_unique').unique();
        table.integer('check_less_than_5');
        table.string('field_exclusion');
      });

      await knex.raw(
        `
        ALTER TABLE :tableName:
        ADD CONSTRAINT check_less_than_5_check_constraint
        CHECK (check_less_than_5 IS NULL OR check_less_than_5 < 5);`,
        {
          tableName,
        },
      );

      await knex.raw(
        `
        ALTER TABLE :tableName:
        ADD CONSTRAINT field_exclusion_exclusion_constraint
        EXCLUDE USING gist (field_exclusion WITH =);
        `,
        {
          tableName,
        },
      );
    }

    await knex(tableName).delete();
    await knex(foreignTableName).delete();
  }

  public static async dropPostgresTableAsync(knex: Knex): Promise<void> {
    const tableName = 'postgres_test_entities';
    const hasTable = await knex.schema.hasTable(tableName);
    if (hasTable) {
      await knex.schema.dropTable(tableName);
    }

    const hasForeignTable = await knex.schema.hasTable(foreignTableName);
    if (hasForeignTable) {
      await knex.schema.dropTable(foreignTableName);
    }
  }
}

class ErrorsTestEntityPrivacyPolicy extends EntityPrivacyPolicy<
  ErrorsTestEntityFields,
  'id',
  ViewerContext,
  ErrorsTestEntity
> {
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<
      ErrorsTestEntityFields,
      'id',
      ViewerContext,
      ErrorsTestEntity
    >(),
  ];
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<
      ErrorsTestEntityFields,
      'id',
      ViewerContext,
      ErrorsTestEntity
    >(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<
      ErrorsTestEntityFields,
      'id',
      ViewerContext,
      ErrorsTestEntity
    >(),
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<
      ErrorsTestEntityFields,
      'id',
      ViewerContext,
      ErrorsTestEntity
    >(),
  ];
}

export const ErrorsTestEntityConfiguration = new EntityConfiguration<ErrorsTestEntityFields, 'id'>({
  idField: 'id',
  tableName: 'postgres_test_entities',
  schema: {
    id: new IntField({
      columnName: 'id',
      cache: false,
    }),
    fieldNonNull: new StringField({
      columnName: 'field_non_null',
    }),
    fieldForeignKey: new IntField({
      columnName: 'field_foreign_key',
    }),
    fieldUnique: new StringField({
      columnName: 'field_unique',
    }),
    checkLessThan5: new IntField({
      columnName: 'check_less_than_5',
    }),
    fieldExclusion: new StringField({
      columnName: 'field_exclusion',
    }),
    nonExistentColumn: new StringField({
      columnName: 'non_existent_column',
    }),
  },
  databaseAdapterFlavor: 'postgres',
  cacheAdapterFlavor: 'redis',
});

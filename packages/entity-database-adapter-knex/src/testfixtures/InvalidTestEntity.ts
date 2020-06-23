import {
  AlwaysAllowPrivacyPolicyRule,
  EntityPrivacyPolicy,
  ViewerContext,
  StringField,
  EntityConfiguration,
  DatabaseAdapterFlavor,
  CacheAdapterFlavor,
  EntityCompanionDefinition,
  Entity,
  NumberField,
} from '@expo/entity';
import Knex from 'knex';

type InvalidTestEntityFields = {
  id: number;
  name: string | null;
};

export default class InvalidTestEntity extends Entity<
  InvalidTestEntityFields,
  number,
  ViewerContext
> {
  static getCompanionDefinition(): EntityCompanionDefinition<
    InvalidTestEntityFields,
    number,
    ViewerContext,
    InvalidTestEntity,
    InvalidTestEntityPrivacyPolicy
  > {
    return invalidTestEntityCompanionDefinition;
  }

  public static async createOrTruncatePostgresTable(knex: Knex): Promise<void> {
    const tableName = this.getCompanionDefinition().entityConfiguration.tableName;
    const hasTable = await knex.schema.hasTable(tableName);
    if (!hasTable) {
      await knex.schema.createTable(tableName, (table) => {
        table.integer('id'); // invalid because ID is not a primary key or unique
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

class InvalidTestEntityPrivacyPolicy extends EntityPrivacyPolicy<
  InvalidTestEntityFields,
  number,
  ViewerContext,
  InvalidTestEntity
> {
  protected readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<
      InvalidTestEntityFields,
      number,
      ViewerContext,
      InvalidTestEntity
    >(),
  ];
  protected readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<
      InvalidTestEntityFields,
      number,
      ViewerContext,
      InvalidTestEntity
    >(),
  ];
  protected readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<
      InvalidTestEntityFields,
      number,
      ViewerContext,
      InvalidTestEntity
    >(),
  ];
  protected readonly deleteRules = [
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
    id: new NumberField({
      columnName: 'id',
    }),
    name: new StringField({
      columnName: 'name',
    }),
  },
});

const invalidTestEntityCompanionDefinition = new EntityCompanionDefinition({
  entityClass: InvalidTestEntity,
  entityConfiguration: invalidTestEntityConfiguration,
  databaseAdaptorFlavor: DatabaseAdapterFlavor.POSTGRES,
  cacheAdaptorFlavor: CacheAdapterFlavor.REDIS,
  privacyPolicyClass: InvalidTestEntityPrivacyPolicy,
});

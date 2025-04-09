import {
  AlwaysAllowPrivacyPolicyRule,
  EntityPrivacyPolicy,
  ViewerContext,
  StringField,
  EntityConfiguration,
  EntityCompanionDefinition,
  Entity,
  EntityMutationTrigger,
  EntityQueryContext,
  EntityValidatorMutationInfo,
  UUIDField,
} from '@expo/entity';
import { Knex } from 'knex';

type PostgresValidatorTestEntityFields = {
  id: string;
  name: string | null;
};

export default class PostgresValidatorTestEntity extends Entity<
  PostgresValidatorTestEntityFields,
  'id',
  ViewerContext
> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    PostgresValidatorTestEntityFields,
    'id',
    ViewerContext,
    PostgresValidatorTestEntity,
    PostgresValidatorTestEntityPrivacyPolicy
  > {
    return {
      entityClass: PostgresValidatorTestEntity,
      entityConfiguration: postgresTestEntityConfiguration,
      privacyPolicyClass: PostgresValidatorTestEntityPrivacyPolicy,
      mutationValidators: [new ThrowConditionallyTrigger('name', 'beforeCreateAndBeforeUpdate')],
    };
  }

  public static async createOrTruncatePostgresTableAsync(knex: Knex): Promise<void> {
    const tableName = 'postgres_test_entities';
    const hasTable = await knex.schema.hasTable(tableName);
    if (!hasTable) {
      await knex.schema.createTable(tableName, (table) => {
        table.uuid('id').defaultTo(knex.raw('gen_random_uuid()')).primary();
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

class PostgresValidatorTestEntityPrivacyPolicy extends EntityPrivacyPolicy<
  PostgresValidatorTestEntityFields,
  'id',
  ViewerContext,
  PostgresValidatorTestEntity
> {
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<
      PostgresValidatorTestEntityFields,
      'id',
      ViewerContext,
      PostgresValidatorTestEntity
    >(),
  ];
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<
      PostgresValidatorTestEntityFields,
      'id',
      ViewerContext,
      PostgresValidatorTestEntity
    >(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<
      PostgresValidatorTestEntityFields,
      'id',
      ViewerContext,
      PostgresValidatorTestEntity
    >(),
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<
      PostgresValidatorTestEntityFields,
      'id',
      ViewerContext,
      PostgresValidatorTestEntity
    >(),
  ];
}

class ThrowConditionallyTrigger extends EntityMutationTrigger<
  PostgresValidatorTestEntityFields,
  'id',
  ViewerContext,
  PostgresValidatorTestEntity
> {
  constructor(
    private readonly fieldName: keyof PostgresValidatorTestEntityFields,
    private readonly badValue: string,
  ) {
    super();
  }

  async executeAsync(
    _viewerContext: ViewerContext,
    _queryContext: EntityQueryContext,
    entity: PostgresValidatorTestEntity,
    _mutationInfo: EntityValidatorMutationInfo<
      PostgresValidatorTestEntityFields,
      'id',
      ViewerContext,
      PostgresValidatorTestEntity
    >,
  ): Promise<void> {
    if (entity.getField(this.fieldName) === this.badValue) {
      throw new Error(`${this.fieldName} cannot have value ${this.badValue}`);
    }
  }
}

export const postgresTestEntityConfiguration = new EntityConfiguration<
  PostgresValidatorTestEntityFields,
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

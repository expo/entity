import {
  Entity,
  EntityCompanionDefinition,
  EntityConfiguration,
  IntField,
  EntityPrivacyPolicy,
  ViewerContext,
  AlwaysAllowPrivacyPolicyRule,
} from '@expo/entity';

export type NumberKeyFields = {
  id: number;
};

export const numberKeyEntityConfiguration = new EntityConfiguration<NumberKeyFields, 'id'>({
  idField: 'id',
  tableName: 'simple_test_entity_should_not_write_to_db',
  schema: {
    id: new IntField({
      columnName: 'custom_id',
      cache: false,
    }),
  },
  databaseAdapterFlavor: 'postgres',
  cacheAdapterFlavor: 'redis',
});

export class NumberKeyPrivacyPolicy extends EntityPrivacyPolicy<
  NumberKeyFields,
  'id',
  ViewerContext,
  NumberKeyEntity
> {
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<NumberKeyFields, 'id', ViewerContext, NumberKeyEntity>(),
  ];
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<NumberKeyFields, 'id', ViewerContext, NumberKeyEntity>(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<NumberKeyFields, 'id', ViewerContext, NumberKeyEntity>(),
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<NumberKeyFields, 'id', ViewerContext, NumberKeyEntity>(),
  ];
}

export default class NumberKeyEntity extends Entity<NumberKeyFields, 'id', ViewerContext> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    NumberKeyFields,
    'id',
    ViewerContext,
    NumberKeyEntity,
    NumberKeyPrivacyPolicy
  > {
    return {
      entityClass: NumberKeyEntity,
      entityConfiguration: numberKeyEntityConfiguration,
      privacyPolicyClass: NumberKeyPrivacyPolicy,
    };
  }
}

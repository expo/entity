import {
  AlwaysAllowPrivacyPolicyRule,
  Entity,
  EntityCompanionDefinition,
  EntityConfiguration,
  EntityPrivacyPolicy,
  UUIDField,
  ViewerContext,
} from '@expo/entity';

export type SimpleTestFields = {
  id: string;
};

export type SimpleTestFieldSelection = keyof SimpleTestFields;

export const simpleTestEntityConfiguration = new EntityConfiguration<SimpleTestFields, 'id'>({
  idField: 'id',
  tableName: 'simple_test_entity_should_not_write_to_db',
  schema: {
    id: new UUIDField({
      columnName: 'custom_id',
      cache: true,
    }),
  },
  databaseAdapterFlavor: 'postgres',
  cacheAdapterFlavor: 'redis',
});

export class SimpleTestEntityPrivacyPolicy extends EntityPrivacyPolicy<
  SimpleTestFields,
  'id',
  ViewerContext,
  SimpleTestEntity,
  SimpleTestFieldSelection
> {
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<
      SimpleTestFields,
      'id',
      ViewerContext,
      SimpleTestEntity,
      SimpleTestFieldSelection
    >(),
  ];
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<
      SimpleTestFields,
      'id',
      ViewerContext,
      SimpleTestEntity,
      SimpleTestFieldSelection
    >(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<
      SimpleTestFields,
      'id',
      ViewerContext,
      SimpleTestEntity,
      SimpleTestFieldSelection
    >(),
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<
      SimpleTestFields,
      'id',
      ViewerContext,
      SimpleTestEntity,
      SimpleTestFieldSelection
    >(),
  ];
}

export class SimpleTestEntity extends Entity<
  SimpleTestFields,
  'id',
  ViewerContext,
  SimpleTestFieldSelection
> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    SimpleTestFields,
    'id',
    ViewerContext,
    SimpleTestEntity,
    SimpleTestEntityPrivacyPolicy,
    SimpleTestFieldSelection
  > {
    return {
      entityClass: SimpleTestEntity,
      entityConfiguration: simpleTestEntityConfiguration,
      privacyPolicyClass: SimpleTestEntityPrivacyPolicy,
    };
  }
}

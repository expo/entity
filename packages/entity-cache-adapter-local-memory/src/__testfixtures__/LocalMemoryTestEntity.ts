import {
  AlwaysAllowPrivacyPolicyRule,
  EntityPrivacyPolicy,
  ViewerContext,
  DateField,
  StringField,
  EntityConfiguration,
  EntityCompanionDefinition,
  Entity,
  UUIDField,
} from '@expo/entity';

export type LocalMemoryTestEntityFields = {
  id: string;
  name: string;
  dateField: Date | null;
};

export default class LocalMemoryTestEntity extends Entity<
  LocalMemoryTestEntityFields,
  'id',
  ViewerContext
> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    LocalMemoryTestEntityFields,
    'id',
    ViewerContext,
    LocalMemoryTestEntity,
    LocalMemoryTestEntityPrivacyPolicy
  > {
    return {
      entityClass: LocalMemoryTestEntity,
      entityConfiguration: localMemoryTestEntityConfiguration,
      privacyPolicyClass: LocalMemoryTestEntityPrivacyPolicy,
    };
  }
}

export class LocalMemoryTestEntityPrivacyPolicy extends EntityPrivacyPolicy<
  LocalMemoryTestEntityFields,
  'id',
  ViewerContext,
  LocalMemoryTestEntity
> {
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<
      LocalMemoryTestEntityFields,
      'id',
      ViewerContext,
      LocalMemoryTestEntity
    >(),
  ];
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<
      LocalMemoryTestEntityFields,
      'id',
      ViewerContext,
      LocalMemoryTestEntity
    >(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<
      LocalMemoryTestEntityFields,
      'id',
      ViewerContext,
      LocalMemoryTestEntity
    >(),
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<
      LocalMemoryTestEntityFields,
      'id',
      ViewerContext,
      LocalMemoryTestEntity
    >(),
  ];
}

export const localMemoryTestEntityConfiguration = new EntityConfiguration<
  LocalMemoryTestEntityFields,
  'id'
>({
  idField: 'id',
  tableName: 'local_memory_test_entities',
  schema: {
    id: new UUIDField({
      columnName: 'id',
      cache: true,
    }),
    name: new StringField({
      columnName: 'name',
      cache: true,
    }),
    dateField: new DateField({
      columnName: 'date_field',
    }),
  },
  databaseAdapterFlavor: 'postgres',
  cacheAdapterFlavor: 'local-memory',
});

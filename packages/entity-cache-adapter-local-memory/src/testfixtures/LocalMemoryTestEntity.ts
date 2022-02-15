import {
  AlwaysAllowPrivacyPolicyRule,
  EntityPrivacyPolicy,
  ViewerContext,
  UUIDField,
  DateField,
  StringField,
  EntityConfiguration,
  EntityCompanionDefinition,
  Entity,
} from '@expo/entity';

export type LocalMemoryTestEntityFields = {
  id: string;
  name: string;
  dateField: Date | null;
};

export default class LocalMemoryTestEntity extends Entity<
  LocalMemoryTestEntityFields,
  string,
  ViewerContext
> {
  static getCompanionDefinition(): EntityCompanionDefinition<
    LocalMemoryTestEntityFields,
    string,
    ViewerContext,
    LocalMemoryTestEntity,
    LocalMemoryTestEntityPrivacyPolicy
  > {
    return localMemoryTestEntityCompanionDefinition;
  }
}

export class LocalMemoryTestEntityPrivacyPolicy extends EntityPrivacyPolicy<
  LocalMemoryTestEntityFields,
  string,
  ViewerContext,
  LocalMemoryTestEntity
> {
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<
      LocalMemoryTestEntityFields,
      string,
      ViewerContext,
      LocalMemoryTestEntity
    >(),
  ];
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<
      LocalMemoryTestEntityFields,
      string,
      ViewerContext,
      LocalMemoryTestEntity
    >(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<
      LocalMemoryTestEntityFields,
      string,
      ViewerContext,
      LocalMemoryTestEntity
    >(),
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<
      LocalMemoryTestEntityFields,
      string,
      ViewerContext,
      LocalMemoryTestEntity
    >(),
  ];
}

export const localMemoryTestEntityConfiguration =
  new EntityConfiguration<LocalMemoryTestEntityFields>({
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

const localMemoryTestEntityCompanionDefinition = new EntityCompanionDefinition({
  entityClass: LocalMemoryTestEntity,
  entityConfiguration: localMemoryTestEntityConfiguration,
  privacyPolicyClass: LocalMemoryTestEntityPrivacyPolicy,
});

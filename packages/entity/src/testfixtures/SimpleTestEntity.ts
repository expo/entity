import Entity from '../Entity';
import {
  DatabaseAdapterFlavor,
  CacheAdapterFlavor,
  EntityCompanionDefinition,
} from '../EntityCompanionProvider';
import EntityConfiguration from '../EntityConfiguration';
import { UUIDField } from '../EntityFields';
import EntityPrivacyPolicy from '../EntityPrivacyPolicy';
import ViewerContext from '../ViewerContext';
import AlwaysAllowPrivacyPolicyRule from '../rules/AlwaysAllowPrivacyPolicyRule';

export type SimpleTestFields = {
  id: string;
};

export type SimpleTestFieldSelection = keyof SimpleTestFields;

export const simpleTestEntityConfiguration = new EntityConfiguration<SimpleTestFields>({
  idField: 'id',
  tableName: 'simple_test_entity_should_not_write_to_db',
  schema: {
    id: new UUIDField({
      columnName: 'custom_id',
    }),
  },
  databaseAdaptorFlavor: DatabaseAdapterFlavor.POSTGRES,
  cacheAdaptorFlavor: CacheAdapterFlavor.REDIS,
});

export class SimpleTestEntityPrivacyPolicy extends EntityPrivacyPolicy<
  SimpleTestFields,
  string,
  ViewerContext,
  SimpleTestEntity,
  SimpleTestFieldSelection
> {
  protected readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<
      SimpleTestFields,
      string,
      ViewerContext,
      SimpleTestEntity,
      SimpleTestFieldSelection
    >(),
  ];
  protected readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<
      SimpleTestFields,
      string,
      ViewerContext,
      SimpleTestEntity,
      SimpleTestFieldSelection
    >(),
  ];
  protected readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<
      SimpleTestFields,
      string,
      ViewerContext,
      SimpleTestEntity,
      SimpleTestFieldSelection
    >(),
  ];
  protected readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<
      SimpleTestFields,
      string,
      ViewerContext,
      SimpleTestEntity,
      SimpleTestFieldSelection
    >(),
  ];
}

export default class SimpleTestEntity extends Entity<
  SimpleTestFields,
  string,
  ViewerContext,
  SimpleTestFieldSelection
> {
  static getCompanionDefinition(): EntityCompanionDefinition<
    SimpleTestFields,
    string,
    ViewerContext,
    SimpleTestEntity,
    SimpleTestEntityPrivacyPolicy,
    SimpleTestFieldSelection
  > {
    return testEntityCompanion;
  }
}

export const testEntityCompanion = new EntityCompanionDefinition({
  entityClass: SimpleTestEntity,
  entityConfiguration: simpleTestEntityConfiguration,
  privacyPolicyClass: SimpleTestEntityPrivacyPolicy,
});

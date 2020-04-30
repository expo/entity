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

export const simpleTestEntityConfiguration = new EntityConfiguration<SimpleTestFields>({
  idField: 'id',
  tableName: 'simple_test_entity_should_not_write_to_db',
  schema: {
    id: new UUIDField({
      columnName: 'custom_id',
    }),
  },
});

export class SimpleTestEntityPrivacyPolicy extends EntityPrivacyPolicy<
  SimpleTestFields,
  string,
  ViewerContext,
  SimpleTestEntity
> {
  protected readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<SimpleTestFields, string, ViewerContext, SimpleTestEntity>(),
  ];
  protected readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<SimpleTestFields, string, ViewerContext, SimpleTestEntity>(),
  ];
  protected readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<SimpleTestFields, string, ViewerContext, SimpleTestEntity>(),
  ];
  protected readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<SimpleTestFields, string, ViewerContext, SimpleTestEntity>(),
  ];
}

export default class SimpleTestEntity extends Entity<SimpleTestFields, string, ViewerContext> {
  static getCompanionDefinition(): EntityCompanionDefinition<
    SimpleTestFields,
    string,
    ViewerContext,
    SimpleTestEntity,
    SimpleTestEntityPrivacyPolicy
  > {
    return testEntityCompanion;
  }
}

export const testEntityCompanion = {
  entityClass: SimpleTestEntity,
  entityConfiguration: simpleTestEntityConfiguration,
  databaseAdaptorFlavor: DatabaseAdapterFlavor.POSTGRES,
  cacheAdaptorFlavor: CacheAdapterFlavor.REDIS,
  privacyPolicyClass: SimpleTestEntityPrivacyPolicy,
};

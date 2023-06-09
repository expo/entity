import Entity from '../Entity';
import { EntityCompanionDefinition } from '../EntityCompanionProvider';
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
  databaseAdapterFlavor: 'postgres',
  cacheAdapterFlavor: 'redis',
});

export class SimpleTestEntityPrivacyPolicy extends EntityPrivacyPolicy<
  SimpleTestFields,
  string,
  ViewerContext,
  SimpleTestEntity,
  SimpleTestFieldSelection
> {
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<
      SimpleTestFields,
      string,
      ViewerContext,
      SimpleTestEntity,
      SimpleTestFieldSelection
    >(),
  ];
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<
      SimpleTestFields,
      string,
      ViewerContext,
      SimpleTestEntity,
      SimpleTestFieldSelection
    >(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<
      SimpleTestFields,
      string,
      ViewerContext,
      SimpleTestEntity,
      SimpleTestFieldSelection
    >(),
  ];
  protected override readonly deleteRules = [
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
  static defineCompanionDefinition(): EntityCompanionDefinition<
    SimpleTestFields,
    string,
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

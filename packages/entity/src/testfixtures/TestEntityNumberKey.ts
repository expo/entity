import Entity from '../Entity';
import { EntityCompanionDefinition } from '../EntityCompanionProvider';
import EntityConfiguration from '../EntityConfiguration';
import { IntField } from '../EntityFields';
import EntityPrivacyPolicy from '../EntityPrivacyPolicy';
import ViewerContext from '../ViewerContext';
import AlwaysAllowPrivacyPolicyRule from '../rules/AlwaysAllowPrivacyPolicyRule';

export type NumberKeyFields = {
  id: number;
};

export const numberKeyEntityConfiguration = new EntityConfiguration<NumberKeyFields>({
  idField: 'id',
  tableName: 'simple_test_entity_should_not_write_to_db',
  schema: {
    id: new IntField({
      columnName: 'custom_id',
    }),
  },
  databaseAdapterFlavor: 'postgres',
  cacheAdapterFlavor: 'redis',
});

export class NumberKeyPrivacyPolicy extends EntityPrivacyPolicy<
  NumberKeyFields,
  number,
  ViewerContext,
  NumberKeyEntity
> {
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<NumberKeyFields, number, ViewerContext, NumberKeyEntity>(),
  ];
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<NumberKeyFields, number, ViewerContext, NumberKeyEntity>(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<NumberKeyFields, number, ViewerContext, NumberKeyEntity>(),
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<NumberKeyFields, number, ViewerContext, NumberKeyEntity>(),
  ];
}

export default class NumberKeyEntity extends Entity<NumberKeyFields, number, ViewerContext> {
  static getCompanionDefinition(): EntityCompanionDefinition<
    NumberKeyFields,
    number,
    ViewerContext,
    NumberKeyEntity,
    NumberKeyPrivacyPolicy
  > {
    return numberKeyEntityCompanion;
  }
}

export const numberKeyEntityCompanion = new EntityCompanionDefinition({
  entityClass: NumberKeyEntity,
  entityConfiguration: numberKeyEntityConfiguration,
  privacyPolicyClass: NumberKeyPrivacyPolicy,
});

import Entity from '../Entity';
import {
  DatabaseAdapterFlavor,
  CacheAdapterFlavor,
  EntityCompanionDefinition,
} from '../EntityCompanionProvider';
import EntityConfiguration from '../EntityConfiguration';
import { NumberField } from '../EntityFields';
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
    id: new NumberField({
      columnName: 'custom_id',
    }),
  },
});

export class NumberKeyPrivacyPolicy extends EntityPrivacyPolicy<
  NumberKeyFields,
  number,
  ViewerContext,
  NumberKeyEntity
> {
  protected readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<NumberKeyFields, number, ViewerContext, NumberKeyEntity>(),
  ];
  protected readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<NumberKeyFields, number, ViewerContext, NumberKeyEntity>(),
  ];
  protected readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<NumberKeyFields, number, ViewerContext, NumberKeyEntity>(),
  ];
  protected readonly deleteRules = [
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
  databaseAdaptorFlavor: DatabaseAdapterFlavor.POSTGRES,
  cacheAdaptorFlavor: CacheAdapterFlavor.REDIS,
  privacyPolicyClass: NumberKeyPrivacyPolicy,
});

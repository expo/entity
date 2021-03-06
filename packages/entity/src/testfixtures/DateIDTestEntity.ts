import Entity from '../Entity';
import { EntityCompanionDefinition } from '../EntityCompanionProvider';
import EntityConfiguration from '../EntityConfiguration';
import { DateField } from '../EntityFields';
import EntityPrivacyPolicy from '../EntityPrivacyPolicy';
import ViewerContext from '../ViewerContext';
import AlwaysAllowPrivacyPolicyRule from '../rules/AlwaysAllowPrivacyPolicyRule';

export type DateIDTestFields = {
  id: Date;
};

export const dateIDTestEntityConfiguration = new EntityConfiguration<DateIDTestFields>({
  idField: 'id',
  tableName: 'simple_test_entity_should_not_write_to_db',
  schema: {
    id: new DateField({
      columnName: 'custom_id',
    }),
  },
  databaseAdapterFlavor: 'postgres',
  cacheAdapterFlavor: 'redis',
});

export class DateIDTestEntityPrivacyPolicy extends EntityPrivacyPolicy<
  DateIDTestFields,
  Date,
  ViewerContext,
  DateIDTestEntity
> {
  protected readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<DateIDTestFields, Date, ViewerContext, DateIDTestEntity>(),
  ];
  protected readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<DateIDTestFields, Date, ViewerContext, DateIDTestEntity>(),
  ];
  protected readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<DateIDTestFields, Date, ViewerContext, DateIDTestEntity>(),
  ];
  protected readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<DateIDTestFields, Date, ViewerContext, DateIDTestEntity>(),
  ];
}

export default class DateIDTestEntity extends Entity<DateIDTestFields, Date, ViewerContext> {
  static getCompanionDefinition(): EntityCompanionDefinition<
    DateIDTestFields,
    Date,
    ViewerContext,
    DateIDTestEntity,
    DateIDTestEntityPrivacyPolicy
  > {
    return dateIDTestEntityCompanion;
  }
}

export const dateIDTestEntityCompanion = new EntityCompanionDefinition({
  entityClass: DateIDTestEntity,
  entityConfiguration: dateIDTestEntityConfiguration,
  privacyPolicyClass: DateIDTestEntityPrivacyPolicy,
});

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

export const dateIDTestEntityConfiguration = new EntityConfiguration<DateIDTestFields, 'id'>({
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
  'id',
  ViewerContext,
  DateIDTestEntity
> {
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<DateIDTestFields, 'id', ViewerContext, DateIDTestEntity>(),
  ];
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<DateIDTestFields, 'id', ViewerContext, DateIDTestEntity>(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<DateIDTestFields, 'id', ViewerContext, DateIDTestEntity>(),
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<DateIDTestFields, 'id', ViewerContext, DateIDTestEntity>(),
  ];
}

export default class DateIDTestEntity extends Entity<DateIDTestFields, 'id', ViewerContext> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    DateIDTestFields,
    'id',
    ViewerContext,
    DateIDTestEntity,
    DateIDTestEntityPrivacyPolicy
  > {
    return {
      entityClass: DateIDTestEntity,
      entityConfiguration: dateIDTestEntityConfiguration,
      privacyPolicyClass: DateIDTestEntityPrivacyPolicy,
    };
  }
}

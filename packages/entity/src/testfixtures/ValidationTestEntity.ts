import Entity from '../Entity';
import {
  DatabaseAdapterFlavor,
  CacheAdapterFlavor,
  EntityCompanionDefinition,
} from '../EntityCompanionProvider';
import EntityConfiguration from '../EntityConfiguration';
import { UUIDField, NumberField } from '../EntityFields';
import EntityPrivacyPolicy from '../EntityPrivacyPolicy';
import ViewerContext from '../ViewerContext';
import AlwaysAllowPrivacyPolicyRule from '../rules/AlwaysAllowPrivacyPolicyRule';

export type ValidationTestFields = {
  id: string;
  numberOtherThanTen: number;
};

export const validationTestEntityConfiguration = new EntityConfiguration<ValidationTestFields>({
  idField: 'id',
  tableName: 'validation_test_entity',
  schema: {
    id: new UUIDField({
      columnName: 'custom_id',
    }),
    numberOtherThanTen: new NumberField({
      columnName: 'not_ten',
      validator: {
        async write(value) {
          if (value === 10) {
            throw new Error('should not be ten');
          }
        },
      },
    }),
  },
});

export class ValidationTestEntityPrivacyPolicy extends EntityPrivacyPolicy<
  ValidationTestFields,
  string,
  ViewerContext,
  ValidationTestEntity
> {
  protected readonly readRules = [new AlwaysAllowPrivacyPolicyRule()];
  protected readonly createRules = [new AlwaysAllowPrivacyPolicyRule()];
  protected readonly updateRules = [new AlwaysAllowPrivacyPolicyRule()];
  protected readonly deleteRules = [new AlwaysAllowPrivacyPolicyRule()];
}

export default class ValidationTestEntity extends Entity<
  ValidationTestFields,
  string,
  ViewerContext
> {
  static getCompanionDefinition(): EntityCompanionDefinition<
    ValidationTestFields,
    string,
    ViewerContext,
    ValidationTestEntity,
    ValidationTestEntityPrivacyPolicy
  > {
    return validationTestEntityCompanion;
  }
}

export const validationTestEntityCompanion = {
  entityClass: ValidationTestEntity,
  entityConfiguration: validationTestEntityConfiguration,
  databaseAdaptorFlavor: DatabaseAdapterFlavor.POSTGRES,
  cacheAdaptorFlavor: CacheAdapterFlavor.REDIS,
  privacyPolicyClass: ValidationTestEntityPrivacyPolicy,
};

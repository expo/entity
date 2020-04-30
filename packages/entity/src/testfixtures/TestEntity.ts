import { result, Result } from '@expo/results';

import Entity from '../Entity';
import {
  DatabaseAdapterFlavor,
  CacheAdapterFlavor,
  EntityCompanionDefinition,
} from '../EntityCompanionProvider';
import EntityConfiguration from '../EntityConfiguration';
import { UUIDField, StringField, DateField, NumberField } from '../EntityFields';
import EntityPrivacyPolicy from '../EntityPrivacyPolicy';
import ViewerContext from '../ViewerContext';
import AlwaysAllowPrivacyPolicyRule from '../rules/AlwaysAllowPrivacyPolicyRule';

export type TestFields = {
  customIdField: string;
  testIndexedField: string;
  stringField: string;
  numberField: number;
  dateField: Date;
};

export const testEntityConfiguration = new EntityConfiguration<TestFields>({
  idField: 'customIdField',
  tableName: 'test_entity_should_not_write_to_db',
  schema: {
    customIdField: new UUIDField({
      columnName: 'custom_id',
    }),
    testIndexedField: new StringField({
      columnName: 'test_index',
      cache: true,
    }),
    stringField: new StringField({
      columnName: 'string_field',
    }),
    numberField: new NumberField({
      columnName: 'number_field',
    }),
    dateField: new DateField({
      columnName: 'date_field',
    }),
  },
});

export class TestEntityPrivacyPolicy extends EntityPrivacyPolicy<
  TestFields,
  string,
  ViewerContext,
  TestEntity
> {
  protected readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<TestFields, string, ViewerContext, TestEntity>(),
  ];
  protected readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<TestFields, string, ViewerContext, TestEntity>(),
  ];
  protected readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<TestFields, string, ViewerContext, TestEntity>(),
  ];
  protected readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<TestFields, string, ViewerContext, TestEntity>(),
  ];
}

export default class TestEntity extends Entity<TestFields, string, ViewerContext> {
  static getCompanionDefinition(): EntityCompanionDefinition<
    TestFields,
    string,
    ViewerContext,
    TestEntity,
    TestEntityPrivacyPolicy
  > {
    return testEntityCompanion;
  }

  getBlah(): string {
    return 'Hello World!';
  }

  static async hello(viewerContext: ViewerContext, testValue: string): Promise<Result<TestEntity>> {
    return result(
      new TestEntity(viewerContext, {
        customIdField: testValue,
        testIndexedField: 'hello',
        stringField: 'hello',
        numberField: 1,
        dateField: new Date(),
      })
    );
  }

  static async returnError(_viewerContext: ViewerContext): Promise<Result<TestEntity>> {
    return result(new Error('return entity'));
  }

  static async throwError(_viewerContext: ViewerContext): Promise<Result<TestEntity>> {
    throw new Error('threw entity');
  }

  static async nonResult(_viewerContext: ViewerContext, testValue: string): Promise<string> {
    return testValue;
  }
}

export const testEntityCompanion = {
  entityClass: TestEntity,
  entityConfiguration: testEntityConfiguration,
  databaseAdaptorFlavor: DatabaseAdapterFlavor.POSTGRES,
  cacheAdaptorFlavor: CacheAdapterFlavor.REDIS,
  privacyPolicyClass: TestEntityPrivacyPolicy,
};

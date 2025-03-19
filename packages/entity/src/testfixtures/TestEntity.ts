import { result, Result } from '@expo/results';

import Entity from '../Entity';
import { EntityCompanionDefinition } from '../EntityCompanionProvider';
import EntityConfiguration from '../EntityConfiguration';
import { UUIDField, StringField, DateField, IntField } from '../EntityFields';
import EntityPrivacyPolicy from '../EntityPrivacyPolicy';
import ViewerContext from '../ViewerContext';
import AlwaysAllowPrivacyPolicyRule from '../rules/AlwaysAllowPrivacyPolicyRule';

export type TestFields = {
  customIdField: string;
  testIndexedField: string;
  stringField: string;
  intField: number;
  dateField: Date;
  nullableField: string | null;
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
    intField: new IntField({
      columnName: 'number_field',
    }),
    dateField: new DateField({
      columnName: 'date_field',
    }),
    nullableField: new StringField({
      columnName: 'nullable_field',
    }),
  },
  databaseAdapterFlavor: 'postgres',
  cacheAdapterFlavor: 'redis',
  compositeFieldDefinitions: [{ compositeField: ['stringField', 'intField'], cache: false }],
});

export class TestEntityPrivacyPolicy extends EntityPrivacyPolicy<
  TestFields,
  string,
  ViewerContext,
  TestEntity
> {
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<TestFields, string, ViewerContext, TestEntity>(),
  ];
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<TestFields, string, ViewerContext, TestEntity>(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<TestFields, string, ViewerContext, TestEntity>(),
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<TestFields, string, ViewerContext, TestEntity>(),
  ];
}

export default class TestEntity extends Entity<TestFields, string, ViewerContext> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    TestFields,
    string,
    ViewerContext,
    TestEntity,
    TestEntityPrivacyPolicy
  > {
    return {
      entityClass: TestEntity,
      entityConfiguration: testEntityConfiguration,
      privacyPolicyClass: TestEntityPrivacyPolicy,
    };
  }

  getBlah(): string {
    return 'Hello World!';
  }

  static async helloAsync(
    viewerContext: ViewerContext,
    testValue: string,
  ): Promise<Result<TestEntity>> {
    const fields = {
      customIdField: testValue,
      testIndexedField: 'hello',
      stringField: 'hello',
      intField: 1,
      dateField: new Date(),
      nullableField: null,
    };
    return result(
      new TestEntity({
        viewerContext,
        id: testValue,
        databaseFields: fields,
        selectedFields: fields,
      }),
    );
  }

  static async returnErrorAsync(_viewerContext: ViewerContext): Promise<Result<TestEntity>> {
    return result(new Error('return entity'));
  }

  static async throwErrorAsync(_viewerContext: ViewerContext): Promise<Result<TestEntity>> {
    throw new Error('threw entity');
  }

  static async nonResultAsync(_viewerContext: ViewerContext, testValue: string): Promise<string> {
    return testValue;
  }
}

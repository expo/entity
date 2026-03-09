import { Entity } from '../../Entity.ts';
import type { EntityCompanionDefinition } from '../../EntityCompanionProvider.ts';
import { EntityConfiguration } from '../../EntityConfiguration.ts';
import { UUIDField } from '../../EntityFields.ts';
import { EntityPrivacyPolicy } from '../../EntityPrivacyPolicy.ts';
import type { ViewerContext } from '../../ViewerContext.ts';
import { AlwaysAllowPrivacyPolicyRule } from '../../rules/AlwaysAllowPrivacyPolicyRule.ts';

export type Test2Fields = {
  id: string;
  foreignKey: string;
};

export const testEntity2Configuration = new EntityConfiguration<Test2Fields, 'id'>({
  idField: 'id',
  tableName: 'test_entity_should_not_write_to_db_2',
  schema: {
    id: new UUIDField({
      columnName: 'id',
      cache: false,
    }),
    foreignKey: new UUIDField({
      columnName: 'foreign_key',
    }),
  },
  databaseAdapterFlavor: 'postgres',
  cacheAdapterFlavor: 'redis',
});

export class TestEntity2PrivacyPolicy extends EntityPrivacyPolicy<
  Test2Fields,
  'id',
  ViewerContext,
  TestEntity2
> {
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<Test2Fields, 'id', ViewerContext, TestEntity2>(),
  ];
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<Test2Fields, 'id', ViewerContext, TestEntity2>(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<Test2Fields, 'id', ViewerContext, TestEntity2>(),
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<Test2Fields, 'id', ViewerContext, TestEntity2>(),
  ];
}

export class TestEntity2 extends Entity<Test2Fields, 'id', ViewerContext> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    Test2Fields,
    'id',
    ViewerContext,
    TestEntity2,
    TestEntity2PrivacyPolicy
  > {
    return {
      entityClass: TestEntity2,
      entityConfiguration: testEntity2Configuration,
      privacyPolicyClass: TestEntity2PrivacyPolicy,
    };
  }
}

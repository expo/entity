import { describe, expect, it } from '@jest/globals';

import { Entity } from '../Entity';
import { EntityCompanionDefinition } from '../EntityCompanionProvider';
import { EntityConfiguration } from '../EntityConfiguration';
import { UUIDField } from '../EntityFields';
import { EntityPrivacyPolicy } from '../EntityPrivacyPolicy';
import { ViewerContext } from '../ViewerContext';
import { AlwaysAllowPrivacyPolicyRule } from '../rules/AlwaysAllowPrivacyPolicyRule';
import { createUnitTestEntityCompanionProvider } from '../utils/__testfixtures__/createUnitTestEntityCompanionProvider';

type TestFieldNormalizationEntityFields = {
  hello: string;
};

const testFieldNormalizationEntityConfiguration = new EntityConfiguration<
  TestFieldNormalizationEntityFields,
  'hello'
>({
  idField: 'hello',
  tableName: 'wat',
  schema: {
    hello: new UUIDField({
      columnName: 'hello',
      cache: true,
    }),
  },
  databaseAdapterFlavor: 'postgres',
  cacheAdapterFlavor: 'redis',
});

class TestFieldNormalizationEntity extends Entity<
  TestFieldNormalizationEntityFields,
  'hello',
  ViewerContext
> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    TestFieldNormalizationEntityFields,
    'hello',
    ViewerContext,
    TestFieldNormalizationEntity,
    TestFieldNormalizationEntityPrivacyPolicy
  > {
    return {
      entityClass: TestFieldNormalizationEntity,
      entityConfiguration: testFieldNormalizationEntityConfiguration,
      privacyPolicyClass: TestFieldNormalizationEntityPrivacyPolicy,
    };
  }
}

class TestFieldNormalizationEntityPrivacyPolicy extends EntityPrivacyPolicy<
  TestFieldNormalizationEntityFields,
  'hello',
  ViewerContext,
  TestFieldNormalizationEntity
> {
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<
      TestFieldNormalizationEntityFields,
      'hello',
      ViewerContext,
      TestFieldNormalizationEntity
    >(),
  ];
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<
      TestFieldNormalizationEntityFields,
      'hello',
      ViewerContext,
      TestFieldNormalizationEntity
    >(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<
      TestFieldNormalizationEntityFields,
      'hello',
      ViewerContext,
      TestFieldNormalizationEntity
    >(),
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<
      TestFieldNormalizationEntityFields,
      'hello',
      ViewerContext,
      TestFieldNormalizationEntity
    >(),
  ];
}

describe('EntityFieldNormalization', () => {
  it('normalizes UUID field input correctly', async () => {
    const entityCompanionProvider = createUnitTestEntityCompanionProvider();
    const vc1 = new ViewerContext(entityCompanionProvider);

    const uuidAllCaps = '550E8400-E29B-41D4-A716-446655440000';

    const createdEntity = await TestFieldNormalizationEntity.creator(vc1)
      .setField('hello', uuidAllCaps)
      .createAsync();
    expect(createdEntity.getID()).toBe('550e8400-e29b-41d4-a716-446655440000');

    const loadedEntity = await TestFieldNormalizationEntity.loader(vc1).loadByIDAsync(uuidAllCaps);
    expect(loadedEntity.getID()).toBe('550e8400-e29b-41d4-a716-446655440000');
  });
});

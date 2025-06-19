import { describe, test } from '@jest/globals';

import { Entity } from '../Entity';
import { EntityCompanionDefinition } from '../EntityCompanionProvider';
import { EntityConfiguration } from '../EntityConfiguration';
import { UUIDField } from '../EntityFields';
import { EntityMutationType, EntityTriggerMutationInfo } from '../EntityMutationInfo';
import { EntityNonTransactionalMutationTrigger } from '../EntityMutationTriggerConfiguration';
import { EntityMutatorFactory } from '../EntityMutatorFactory';
import { EntityPrivacyPolicy } from '../EntityPrivacyPolicy';
import { ViewerContext } from '../ViewerContext';
import { AlwaysAllowPrivacyPolicyRule } from '../rules/AlwaysAllowPrivacyPolicyRule';
import { createUnitTestEntityCompanionProvider } from '../utils/__testfixtures__/createUnitTestEntityCompanionProvider';

type BlahFields = {
  id: string;
};

class BlahEntityPrivacyPolicy extends EntityPrivacyPolicy<
  BlahFields,
  'id',
  ViewerContext,
  BlahEntity
> {
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<BlahFields, 'id', ViewerContext, BlahEntity>(),
  ];
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<BlahFields, 'id', ViewerContext, BlahEntity>(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<BlahFields, 'id', ViewerContext, BlahEntity>(),
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<BlahFields, 'id', ViewerContext, BlahEntity>(),
  ];
}

class BlahEntity extends Entity<BlahFields, 'id', ViewerContext> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    BlahFields,
    'id',
    ViewerContext,
    BlahEntity,
    BlahEntityPrivacyPolicy
  > {
    return {
      entityClass: BlahEntity,
      entityConfiguration: new EntityConfiguration<BlahFields, 'id'>({
        idField: 'id',
        tableName: 'blah_table',
        schema: {
          id: new UUIDField({
            columnName: 'id',
            cache: true,
          }),
        },
        databaseAdapterFlavor: 'postgres',
        cacheAdapterFlavor: 'redis',
      }),
      privacyPolicyClass: BlahEntityPrivacyPolicy,
      mutationTriggers: {
        afterCommit: [new TestNonTransactionalMutationTrigger()],
      },
    };
  }
}

class TestNonTransactionalMutationTrigger extends EntityNonTransactionalMutationTrigger<
  BlahFields,
  'id',
  ViewerContext,
  BlahEntity
> {
  async executeAsync(
    viewerContext: ViewerContext,
    entity: BlahEntity,
    mutationInfo: EntityTriggerMutationInfo<BlahFields, 'id', ViewerContext, BlahEntity>,
  ): Promise<void> {
    if (mutationInfo.type === EntityMutationType.DELETE) {
      const entityLoaded = await BlahEntity.loader(viewerContext).loadByIDNullableAsync(
        entity.getID(),
      );
      if (entityLoaded) {
        throw new Error(
          'should not have been able to re-load the entity after delete. this means the cache has not been cleared',
        );
      }
    }
  }
}

describe(EntityMutatorFactory, () => {
  test('cache consistency with post-commit callbacks', async () => {
    const companionProvider = createUnitTestEntityCompanionProvider();
    const viewerContext = new ViewerContext(companionProvider);

    // put it in cache
    const entity = await BlahEntity.creator(viewerContext).createAsync();
    const entityLoaded = await BlahEntity.loader(viewerContext).loadByIDAsync(entity.getID());

    await BlahEntity.deleter(entityLoaded).deleteAsync();
  });
});

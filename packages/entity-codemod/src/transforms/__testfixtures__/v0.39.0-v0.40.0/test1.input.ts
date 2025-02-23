/* eslint-disable */

import { ViewerContext } from '@expo/entity';

async function testWithAuthorizationResults(viewerContext: ViewerContext): Promise<void> {
  // creator
  const entityResult = await TestEntity.creator(viewerContext).setField('wat', 2).createAsync();

  // updater
  const updatedEntityResult = await TestEntity.updater(entityResult.enforceValue()).setField('wat', 3).updateAsync();

  // deleter
  await TestEntity.deleteAsync(updatedEntityResult.enforceValue());
}

async function testEnforcing(viewerContext: ViewerContext): Promise<void> {
  // creator
  const entity = await TestEntity.creator(viewerContext).setField('wat', 2).enforceCreateAsync();
  const entity2 = await TestEntity.creator(viewerContext).setField('wat', 2).setField('who', 3).enforceCreateAsync();
  const entity3 = await TestEntity.creator(viewerContext)
    .setField('wat', 2)
    .setField('who', 3)
    .setField('who', 4)
    .setField('who', 5)
    .setField('who', 6)
    .setField('who', 7)
    .setField('who', 8)
    .setField('who', 9)
    .enforceCreateAsync();

  // updater
  const updatedEntity = await TestEntity.updater(entity).setField('wat', 3).enforceUpdateAsync();
  const updatedEntity2 = await TestEntity.updater(entity2).setField('wat', 3).setField('who', 4).enforceUpdateAsync();
  const updatedEntity3 = await TestEntity.updater(entity3)
    .setField('wat', 3)
    .setField('who', 4)
    .setField('who', 5)
    .setField('who', 6)
    .setField('who', 7)
    .setField('who', 8)
    .setField('who', 9)
    .enforceUpdateAsync();

  // deleter
  await TestEntity.enforceDeleteAsync(entity);
}

async function testNoSetField(viewerContext: ViewerContext): Promise<void> {
  // creator
  const entity = await TestEntity.creator(viewerContext).enforceCreateAsync();

  // updater
  const updatedEntity = await TestEntity.updater(entity).enforceUpdateAsync();
}

async function testEnforcingWithQueryContext(viewerContext: ViewerContext): Promise<void> {
  // creator
  const entity = await TestEntity.creator(viewerContext, queryContext).setField('wat', 2).enforceCreateAsync();

  // updater
  const updatedEntity = await TestEntity.updater(entity, queryContext).setField('wat', 3).enforceUpdateAsync();

  // deleter
  await TestEntity.enforceDeleteAsync(entity, queryContext);
}

async function testAssociationLoader(): Promise<void> {
  await this.associationLoader().loadAssociatedEntityAsync(
    'another_id',
    AnotherEntity,
    queryContext
  );

  await entity.associationLoader().loadAssociatedEntityAsync(
    'another_id',
    AnotherEntity,
    queryContext
  )
}

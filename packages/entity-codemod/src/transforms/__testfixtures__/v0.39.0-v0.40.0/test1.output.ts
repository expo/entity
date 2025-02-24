/* eslint-disable */

import { ViewerContext } from '@expo/entity';

async function testWithAuthorizationResults(viewerContext: ViewerContext): Promise<void> {
  // creator
  const entityResult = await TestEntity.creator(viewerContext).withAuthorizationResults().setField('wat', 2).createAsync();

  // updater
  const updatedEntityResult = await TestEntity.updater(entityResult.enforceValue()).withAuthorizationResults().setField('wat', 3).updateAsync();

  // deleter
  await TestEntity.deleter(updatedEntityResult.enforceValue()).withAuthorizationResults().deleteAsync();
}

async function testEnforcing(viewerContext: ViewerContext): Promise<void> {
  // creator
  const entity = await TestEntity.creator(viewerContext).enforcing().setField('wat', 2).createAsync();
  const entity2 = await TestEntity.creator(viewerContext).enforcing().setField('wat', 2).setField('who', 3).createAsync();
  const entity3 = await TestEntity.creator(viewerContext).enforcing()
    .setField('wat', 2)
    .setField('who', 3)
    .setField('who', 4)
    .setField('who', 5)
    .setField('who', 6)
    .setField('who', 7)
    .setField('who', 8)
    .setField('who', 9)
    .createAsync();

  // updater
  const updatedEntity = await TestEntity.updater(entity).enforcing().setField('wat', 3).updateAsync();
  const updatedEntity2 = await TestEntity.updater(entity2).enforcing().setField('wat', 3).setField('who', 4).updateAsync();
  const updatedEntity3 = await TestEntity.updater(entity3).enforcing()
    .setField('wat', 3)
    .setField('who', 4)
    .setField('who', 5)
    .setField('who', 6)
    .setField('who', 7)
    .setField('who', 8)
    .setField('who', 9)
    .updateAsync();

  // deleter
  await TestEntity.deleter(entity).enforcing().deleteAsync();
}

async function testNoSetField(viewerContext: ViewerContext): Promise<void> {
  // creator
  const entity = await TestEntity.creator(viewerContext).enforcing().createAsync();

  // updater
  const updatedEntity = await TestEntity.updater(entity).enforcing().updateAsync();
}

async function testEnforcingWithQueryContext(viewerContext: ViewerContext): Promise<void> {
  // creator
  const entity = await TestEntity.creator(viewerContext, queryContext).enforcing().setField('wat', 2).createAsync();

  // updater
  const updatedEntity = await TestEntity.updater(entity, queryContext).enforcing().setField('wat', 3).updateAsync();

  // deleter
  await TestEntity.deleter(entity, queryContext).enforcing().deleteAsync();
}

async function testAssociationLoader(): Promise<void> {
  await this.associationLoader().withAuthorizationResults().loadAssociatedEntityAsync(
    'another_id',
    AnotherEntity,
    queryContext
  );

  await entity.associationLoader().withAuthorizationResults().loadAssociatedEntityAsync(
    'another_id',
    AnotherEntity,
    queryContext
  )
}

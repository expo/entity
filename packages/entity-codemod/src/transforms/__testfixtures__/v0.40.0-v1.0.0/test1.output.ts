/* eslint-disable */

import { ViewerContext } from '@expo/entity';

async function testWithAuthorizationResults(viewerContext: ViewerContext): Promise<void> {
  // creator
  const entityResult = await TestEntity.creatorWithAuthorizationResults(viewerContext).setField('wat', 2).createAsync();

  // updater
  const updatedEntityResult = await TestEntity.updaterWithAuthorizationResults(entityResult.enforceValue()).setField('wat', 3).updateAsync();

  // loader
  const loadedEntityResult = await TestEntity.loaderWithAuthorizationResults(viewerContext).loadByIDAsync('test');

  // deleter
  await TestEntity.deleterWithAuthorizationResults(updatedEntityResult.enforceValue()).deleteAsync();
}

async function testEnforcing(viewerContext: ViewerContext): Promise<void> {
  // creator
  const entity = await TestEntity.creator(viewerContext).setField('wat', 2).createAsync();
  const entity2 = await TestEntity.creator(viewerContext).setField('wat', 2).setField('who', 3).createAsync();
  const entity3 = await TestEntity.creator(viewerContext)
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
  const updatedEntity = await TestEntity.updater(entity).setField('wat', 3).updateAsync();
  const updatedEntity2 = await TestEntity.updater(entity2).setField('wat', 3).setField('who', 4).updateAsync();
  const updatedEntity3 = await TestEntity.updater(entity3)
    .setField('wat', 3)
    .setField('who', 4)
    .setField('who', 5)
    .setField('who', 6)
    .setField('who', 7)
    .setField('who', 8)
    .setField('who', 9)
    .updateAsync();

  // loader
  const loadedEntity = await TestEntity.loader(viewerContext).loadByIDAsync('test');

  // deleter
  await TestEntity.deleter(entity).deleteAsync();
}

async function testNoSetField(viewerContext: ViewerContext): Promise<void> {
  // creator
  const entity = await TestEntity.creator(viewerContext).createAsync();

  // updater
  const updatedEntity = await TestEntity.updater(entity).updateAsync();
}

async function testEnforcingWithQueryContext(viewerContext: ViewerContext): Promise<void> {
  // creator
  const entity = await TestEntity.creator(viewerContext, queryContext).setField('wat', 2).createAsync();

  // updater
  const updatedEntity = await TestEntity.updater(entity, queryContext).setField('wat', 3).updateAsync();

  // loader
  const loadedEntity = await TestEntity.loader(viewerContext, queryContext).loadByIDAsync('test');

  // deleter
  await TestEntity.deleter(entity, queryContext).deleteAsync();
}

async function testAssociationLoader(): Promise<void> {
  await this.associationLoaderWithAuthorizationResults().loadAssociatedEntityAsync(
    'another_id',
    AnotherEntity,
    queryContext
  );

  await entity.associationLoaderWithAuthorizationResults().loadAssociatedEntityAsync(
    'another_id',
    AnotherEntity,
    queryContext
  )

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

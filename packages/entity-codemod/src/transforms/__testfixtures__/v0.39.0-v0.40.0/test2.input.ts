/* eslint-disable */

async function testAsync(viewerContext: ViewerContext): Promise<void> {
  const testTrigger = await TestTriggerEntity.createAsync(actorViewerContext, undefined, {
    appId,
  });

  await TestTriggerEntity.enforceDeleteAsync(testTrigger);
  return testTrigger;
};

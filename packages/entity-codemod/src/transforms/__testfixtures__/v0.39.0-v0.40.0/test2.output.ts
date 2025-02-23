/* eslint-disable */

async function testAsync(viewerContext: ViewerContext): Promise<void> {
  const testTrigger = await TestTriggerEntity.createAsync(actorViewerContext, undefined, {
    appId,
  });

  await TestTriggerEntity.deleter(testTrigger).enforcing().deleteAsync();
  return testTrigger;
};

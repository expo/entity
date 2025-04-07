import EntityMutatorFactory from '../EntityMutatorFactory';
import ViewerContext from '../ViewerContext';
import TestEntity from '../utils/__testfixtures__/TestEntity';
import { createUnitTestEntityCompanionProvider } from '../utils/__testfixtures__/createUnitTestEntityCompanionProvider';

describe(EntityMutatorFactory, () => {
  test('cache consistency across single and composite field mutations', async () => {
    const companionProvider = createUnitTestEntityCompanionProvider();
    const viewerContext = new ViewerContext(companionProvider);

    // put the entity in cache
    let entity = await TestEntity.creator(viewerContext)
      .setField('stringField', 'test')
      .setField('intField', 4)
      .createAsync();
    const entitiesLoadedSingle = await TestEntity.loader(
      viewerContext,
    ).loadManyByFieldEqualingAsync('stringField', 'test');
    expect(entitiesLoadedSingle.length).toBe(1);
    const entitiesLoadedComposite = await TestEntity.loader(
      viewerContext,
    ).loadManyByCompositeFieldEqualingAsync(['stringField', 'intField'], {
      stringField: 'test',
      intField: 4,
    });
    expect(entitiesLoadedComposite.length).toBe(1);

    // update the string field
    entity = await TestEntity.updater(entity).setField('stringField', 'wat').updateAsync();

    // check that old cache entries are gone
    const entitiesLoadedSingle2 = await TestEntity.loader(
      viewerContext,
    ).loadManyByFieldEqualingAsync('stringField', 'test');
    expect(entitiesLoadedSingle2.length).toBe(0);
    const entitiesLoadedComposite2 = await TestEntity.loader(
      viewerContext,
    ).loadManyByCompositeFieldEqualingAsync(['stringField', 'intField'], {
      stringField: 'test',
      intField: 4,
    });
    expect(entitiesLoadedComposite2.length).toBe(0);

    // check that new cache entries are there
    const entitiesLoadedSingle3 = await TestEntity.loader(
      viewerContext,
    ).loadManyByFieldEqualingAsync('stringField', 'wat');
    expect(entitiesLoadedSingle3.length).toBe(1);
    const entitiesLoadedComposite3 = await TestEntity.loader(
      viewerContext,
    ).loadManyByCompositeFieldEqualingAsync(['stringField', 'intField'], {
      stringField: 'wat',
      intField: 4,
    });
    expect(entitiesLoadedComposite3.length).toBe(1);

    // delete the entity
    await TestEntity.deleter(entity).deleteAsync();

    // check that cache entries are gone
    const entitiesLoadedSingle4 = await TestEntity.loader(
      viewerContext,
    ).loadManyByFieldEqualingAsync('stringField', 'wat');
    expect(entitiesLoadedSingle4.length).toBe(0);
    const entitiesLoadedComposite4 = await TestEntity.loader(
      viewerContext,
    ).loadManyByCompositeFieldEqualingAsync(['stringField', 'intField'], {
      stringField: 'wat',
      intField: 4,
    });
    expect(entitiesLoadedComposite4.length).toBe(0);
  });
});

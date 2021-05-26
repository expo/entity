import { anyOfClass, anything, deepEqual, instance, mock, spy, verify, when } from 'ts-mockito';

import { EntityNonTransactionalQueryContext } from '../EntityQueryContext';
import EntitySecondaryCacheLoader, { ISecondaryEntityCache } from '../EntitySecondaryCacheLoader';
import ViewerContext from '../ViewerContext';
import SimpleTestEntity, {
  SimpleTestEntityPrivacyPolicy,
  SimpleTestFields,
} from '../testfixtures/SimpleTestEntity';
import { createUnitTestEntityCompanionProvider } from '../utils/testing/createUnitTestEntityCompanionProvider';

type TestLoadParams = { id: string };

class TestSecondaryRedisCacheLoader extends EntitySecondaryCacheLoader<
  TestLoadParams,
  SimpleTestFields,
  string,
  ViewerContext,
  SimpleTestEntity,
  SimpleTestEntityPrivacyPolicy
> {
  protected async fetchObjectsFromDatabaseAsync(
    _loadParamsArray: readonly Readonly<TestLoadParams>[]
  ): Promise<ReadonlyMap<Readonly<TestLoadParams>, Readonly<SimpleTestFields>>> {
    // unused
    return new Map();
  }
}

describe(EntitySecondaryCacheLoader, () => {
  describe('loadManyAsync', () => {
    it('calls into secondary cache with correct params', async () => {
      const vc1 = new ViewerContext(createUnitTestEntityCompanionProvider());

      const createdEntity = await SimpleTestEntity.creator(vc1).enforceCreateAsync();
      const loadParams = { id: createdEntity.getID() };

      const secondaryEntityCacheMock = mock<
        ISecondaryEntityCache<SimpleTestFields, TestLoadParams>
      >();
      when(
        secondaryEntityCacheMock.loadManyThroughAsync(deepEqual([loadParams]), anything())
      ).thenResolve(new Map());
      const secondaryEntityCache = instance(secondaryEntityCacheMock);

      const secondaryCacheLoader = new TestSecondaryRedisCacheLoader(
        secondaryEntityCache,
        SimpleTestEntity.loader(vc1)
      );

      await secondaryCacheLoader.loadManyAsync([loadParams]);

      verify(
        secondaryEntityCacheMock.loadManyThroughAsync(deepEqual([loadParams]), anything())
      ).once();
    });

    it('constructs and authorizes entities', async () => {
      const vc1 = new ViewerContext(createUnitTestEntityCompanionProvider());

      const createdEntity = await SimpleTestEntity.creator(vc1).enforceCreateAsync();
      const loadParams = { id: createdEntity.getID() };

      const secondaryEntityCacheMock = mock<
        ISecondaryEntityCache<SimpleTestFields, TestLoadParams>
      >();
      when(
        secondaryEntityCacheMock.loadManyThroughAsync(deepEqual([loadParams]), anything())
      ).thenResolve(new Map([[loadParams, createdEntity.getAllFields()]]));
      const secondaryEntityCache = instance(secondaryEntityCacheMock);

      const loader = SimpleTestEntity.loader(vc1);
      const spiedPrivacyPolicy = spy(loader['privacyPolicy']);
      const secondaryCacheLoader = new TestSecondaryRedisCacheLoader(secondaryEntityCache, loader);

      const result = await secondaryCacheLoader.loadManyAsync([loadParams]);
      expect(result.get(loadParams)?.enforceValue().getID()).toEqual(createdEntity.getID());

      verify(
        spiedPrivacyPolicy.authorizeReadAsync(
          vc1,
          anyOfClass(EntityNonTransactionalQueryContext),
          anything()
        )
      ).once();
    });
  });

  describe('invalidateManyAsync', () => {
    it('calls invalidate on the secondary cache', async () => {
      const vc1 = new ViewerContext(createUnitTestEntityCompanionProvider());

      const createdEntity = await SimpleTestEntity.creator(vc1).enforceCreateAsync();
      const loadParams = { id: createdEntity.getID() };

      const secondaryEntityCacheMock = mock<
        ISecondaryEntityCache<SimpleTestFields, TestLoadParams>
      >();
      const secondaryEntityCache = instance(secondaryEntityCacheMock);
      const loader = SimpleTestEntity.loader(vc1);
      const secondaryCacheLoader = new TestSecondaryRedisCacheLoader(secondaryEntityCache, loader);
      await secondaryCacheLoader.invalidateManyAsync([loadParams]);

      verify(secondaryEntityCacheMock.invalidateManyAsync(deepEqual([loadParams]))).once();
    });
  });
});

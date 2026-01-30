import { describe, expect, it } from '@jest/globals';
import { anyOfClass, anything, deepEqual, instance, mock, spy, verify, when } from 'ts-mockito';

import { EntityNonTransactionalQueryContext } from '../EntityQueryContext';
import { EntitySecondaryCacheLoader, ISecondaryEntityCache } from '../EntitySecondaryCacheLoader';
import { ViewerContext } from '../ViewerContext';
import {
  SimpleTestEntity,
  SimpleTestEntityPrivacyPolicy,
  SimpleTestFields,
} from '../utils/__testfixtures__/SimpleTestEntity';
import { createUnitTestEntityCompanionProvider } from '../utils/__testfixtures__/createUnitTestEntityCompanionProvider';

type TestLoadParams = { id: string };

class TestSecondaryRedisCacheLoader extends EntitySecondaryCacheLoader<
  TestLoadParams,
  SimpleTestFields,
  'id',
  ViewerContext,
  SimpleTestEntity,
  SimpleTestEntityPrivacyPolicy
> {
  protected async fetchObjectsFromDatabaseAsync(
    _loadParamsArray: readonly Readonly<TestLoadParams>[],
  ): Promise<ReadonlyMap<Readonly<TestLoadParams>, Readonly<SimpleTestFields>>> {
    // unused
    return new Map();
  }
}

describe(EntitySecondaryCacheLoader, () => {
  describe('loadManyAsync', () => {
    it('calls into secondary cache with correct params', async () => {
      const vc1 = new ViewerContext(createUnitTestEntityCompanionProvider());

      const createdEntity = await SimpleTestEntity.creator(vc1).createAsync();
      const loadParams = { id: createdEntity.getID() };

      const secondaryEntityCacheMock =
        mock<ISecondaryEntityCache<SimpleTestFields, TestLoadParams>>();
      when(
        secondaryEntityCacheMock.loadManyThroughAsync(deepEqual([loadParams]), anything()),
      ).thenResolve(new Map());
      const secondaryEntityCache = instance(secondaryEntityCacheMock);

      const secondaryCacheLoader = new TestSecondaryRedisCacheLoader(
        secondaryEntityCache,
        SimpleTestEntity.loaderWithAuthorizationResults(vc1),
        SimpleTestEntity.knexLoaderWithAuthorizationResults(vc1),
      );

      await secondaryCacheLoader.loadManyAsync([loadParams]);

      verify(
        secondaryEntityCacheMock.loadManyThroughAsync(deepEqual([loadParams]), anything()),
      ).once();
    });

    it('constructs and authorizes entities', async () => {
      const vc1 = new ViewerContext(createUnitTestEntityCompanionProvider());

      const createdEntity = await SimpleTestEntity.creator(vc1).createAsync();
      const loadParams = { id: createdEntity.getID() };

      const secondaryEntityCacheMock =
        mock<ISecondaryEntityCache<SimpleTestFields, TestLoadParams>>();
      when(
        secondaryEntityCacheMock.loadManyThroughAsync(deepEqual([loadParams]), anything()),
      ).thenResolve(new Map([[loadParams, createdEntity.getAllFields()]]));
      const secondaryEntityCache = instance(secondaryEntityCacheMock);

      const loader = SimpleTestEntity.loaderWithAuthorizationResults(vc1);
      const knexLoader = SimpleTestEntity.knexLoaderWithAuthorizationResults(vc1);
      const spiedPrivacyPolicy = spy(loader.utils['privacyPolicy']);
      const secondaryCacheLoader = new TestSecondaryRedisCacheLoader(
        secondaryEntityCache,
        loader,
        knexLoader,
      );

      const result = await secondaryCacheLoader.loadManyAsync([loadParams]);
      expect(result.get(loadParams)?.enforceValue().getID()).toEqual(createdEntity.getID());

      verify(
        spiedPrivacyPolicy.authorizeReadAsync(
          vc1,
          anyOfClass(EntityNonTransactionalQueryContext),
          anything(),
          anything(),
          anything(),
        ),
      ).once();
    });
  });

  describe('invalidateManyAsync', () => {
    it('calls invalidate on the secondary cache', async () => {
      const vc1 = new ViewerContext(createUnitTestEntityCompanionProvider());

      const createdEntity = await SimpleTestEntity.creator(vc1).createAsync();
      const loadParams = { id: createdEntity.getID() };

      const secondaryEntityCacheMock =
        mock<ISecondaryEntityCache<SimpleTestFields, TestLoadParams>>();
      const secondaryEntityCache = instance(secondaryEntityCacheMock);
      const loader = SimpleTestEntity.loaderWithAuthorizationResults(vc1);
      const knexLoader = SimpleTestEntity.knexLoaderWithAuthorizationResults(vc1);
      const secondaryCacheLoader = new TestSecondaryRedisCacheLoader(
        secondaryEntityCache,
        loader,
        knexLoader,
      );
      await secondaryCacheLoader.invalidateManyAsync([loadParams]);

      verify(secondaryEntityCacheMock.invalidateManyAsync(deepEqual([loadParams]))).once();
    });
  });
});

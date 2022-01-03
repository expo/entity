import invariant from 'invariant';

import { EntityQueryContext } from '../EntityQueryContext';
import ViewerContext from '../ViewerContext';
import { createUnitTestEntityCompanionProvider } from '../utils/testing/createUnitTestEntityCompanionProvider';

describe(EntityQueryContext, () => {
  describe('callbacks', () => {
    it('calls all callbacks, and calls invalidation first', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);

      const preCommitFirstCallback = jest.fn(async (): Promise<void> => {});
      const preCommitSecondCallback = jest.fn(async (): Promise<void> => {});
      const postCommitInvalidationCallback = jest.fn(async (): Promise<void> => {
        invariant(
          preCommitFirstCallback.mock.calls.length === 1,
          'preCommit should be called before postCommitInvalidation'
        );
        invariant(
          preCommitSecondCallback.mock.calls.length === 1,
          'preCommit should be called before postCommitInvalidation'
        );
      });
      const postCommitCallback = jest.fn(async (): Promise<void> => {
        invariant(
          preCommitFirstCallback.mock.calls.length === 1,
          'preCommit should be called before postCommit'
        );
        invariant(
          preCommitSecondCallback.mock.calls.length === 1,
          'preCommit should be called before postCommit'
        );
        invariant(
          postCommitInvalidationCallback.mock.calls.length === 1,
          'postCommitInvalidation should be called before postCommit'
        );
      });

      await viewerContext.runInTransactionForDatabaseAdaptorFlavorAsync(
        'postgres',
        async (queryContext) => {
          queryContext.appendPostCommitCallback(postCommitCallback);
          queryContext.appendPostCommitInvalidationCallback(postCommitInvalidationCallback);
          queryContext.appendPreCommitCallback(preCommitSecondCallback, 2);
          queryContext.appendPreCommitCallback(preCommitFirstCallback, 1);
        }
      );

      expect(preCommitFirstCallback).toHaveBeenCalledTimes(1);
      expect(preCommitSecondCallback).toHaveBeenCalledTimes(1);
      expect(postCommitCallback).toHaveBeenCalledTimes(1);
      expect(postCommitInvalidationCallback).toHaveBeenCalledTimes(1);
    });

    it('prevents transaction from finishing when precommit throws (post commit callbacks are not called)', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);

      const preCommitCallback = jest.fn(async (): Promise<void> => {
        throw new Error('wat');
      });
      const postCommitInvalidationCallback = jest.fn(async (): Promise<void> => {});
      const postCommitCallback = jest.fn(async (): Promise<void> => {});

      await expect(
        viewerContext.runInTransactionForDatabaseAdaptorFlavorAsync(
          'postgres',
          async (queryContext) => {
            queryContext.appendPostCommitCallback(postCommitCallback);
            queryContext.appendPostCommitInvalidationCallback(postCommitInvalidationCallback);
            queryContext.appendPreCommitCallback(preCommitCallback, 0);
          }
        )
      ).rejects.toThrowError('wat');

      expect(preCommitCallback).toHaveBeenCalledTimes(1);
      expect(postCommitCallback).toHaveBeenCalledTimes(0);
      expect(postCommitInvalidationCallback).toHaveBeenCalledTimes(0);
    });
  });
});

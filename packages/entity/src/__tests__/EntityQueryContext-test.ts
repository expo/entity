import invariant from 'invariant';

import { EntityQueryContext } from '../EntityQueryContext';
import ViewerContext from '../ViewerContext';
import { createUnitTestEntityCompanionProvider } from '../utils/testing/createUnitTestEntityCompanionProvider';

describe(EntityQueryContext, () => {
  describe('callbacks', () => {
    it('calls all callbacks, and calls invalidation first', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);

      let preCommitFirstCallCount = 0;
      let preCommitSecondCallCount = 0;
      let postCommitCallCount = 0;
      let postCommitInvalidationCallCount = 0;

      const preCommitFirstCallback = async (): Promise<void> => {
        preCommitFirstCallCount++;
      };
      const preCommitSecondCallback = async (): Promise<void> => {
        preCommitSecondCallCount++;
      };
      const postCommitInvalidationCallback = async (): Promise<void> => {
        postCommitInvalidationCallCount++;
        invariant(
          preCommitFirstCallCount === 1,
          'preCommitInvalidation should be called before postCommits'
        );
        invariant(
          preCommitSecondCallCount === 1,
          'preCommitInvalidation should be called before postCommits'
        );
      };
      const postCommitCallback = async (): Promise<void> => {
        postCommitCallCount++;
        invariant(
          preCommitFirstCallCount === 1,
          'preCommitInvalidation should be called before postCommits'
        );
        invariant(
          preCommitSecondCallCount === 1,
          'preCommitInvalidation should be called before postCommits'
        );
        invariant(
          postCommitInvalidationCallCount === 1,
          'postCommitInvalidation should be called before postCommit'
        );
      };

      await viewerContext.runInTransactionForDatabaseAdaptorFlavorAsync(
        'postgres',
        async (queryContext) => {
          queryContext.appendPostCommitCallback(postCommitCallback);
          queryContext.appendPostCommitInvalidationCallback(postCommitInvalidationCallback);
          queryContext.appendPreCommitCallback(preCommitSecondCallback, 2);
          queryContext.appendPreCommitCallback(preCommitFirstCallback, 1);
        }
      );

      expect(preCommitFirstCallCount).toBe(1);
      expect(preCommitSecondCallCount).toBe(1);
      expect(postCommitCallCount).toBe(1);
      expect(postCommitInvalidationCallCount).toBe(1);
    });

    it('prevents transaction from finishing when precommit throws (post commit callbacks are not called)', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);

      let preCommitCallCount = 0;
      let postCommitCallCount = 0;
      let postCommitInvalidationCallCount = 0;

      const preCommitCallback = async (): Promise<void> => {
        preCommitCallCount++;
        throw new Error('wat');
      };
      const postCommitInvalidationCallback = async (): Promise<void> => {
        postCommitInvalidationCallCount++;
      };
      const postCommitCallback = async (): Promise<void> => {
        postCommitCallCount++;
      };

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

      expect(preCommitCallCount).toBe(1);
      expect(postCommitCallCount).toBe(0);
      expect(postCommitInvalidationCallCount).toBe(0);
    });
  });
});

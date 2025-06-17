import { describe, expect, it, jest } from '@jest/globals';
import assert from 'assert';
import invariant from 'invariant';

import EntityCompanionProvider from '../EntityCompanionProvider';
import {
  EntityQueryContext,
  TransactionalDataLoaderMode,
  TransactionConfig,
  TransactionIsolationLevel,
} from '../EntityQueryContext';
import EntityQueryContextProvider from '../EntityQueryContextProvider';
import ViewerContext from '../ViewerContext';
import NoOpEntityMetricsAdapter from '../metrics/NoOpEntityMetricsAdapter';
import { InMemoryFullCacheStubCacheAdapterProvider } from '../utils/__testfixtures__/StubCacheAdapter';
import StubDatabaseAdapterProvider from '../utils/__testfixtures__/StubDatabaseAdapterProvider';
import { createUnitTestEntityCompanionProvider } from '../utils/__testfixtures__/createUnitTestEntityCompanionProvider';

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
          'preCommit should be called before postCommitInvalidation',
        );
        invariant(
          preCommitSecondCallback.mock.calls.length === 1,
          'preCommit should be called before postCommitInvalidation',
        );
      });
      const postCommitCallback = jest.fn(async (): Promise<void> => {
        invariant(
          preCommitFirstCallback.mock.calls.length === 1,
          'preCommit should be called before postCommit',
        );
        invariant(
          preCommitSecondCallback.mock.calls.length === 1,
          'preCommit should be called before postCommit',
        );
        invariant(
          postCommitInvalidationCallback.mock.calls.length === 1,
          'postCommitInvalidation should be called before postCommit',
        );
      });

      await viewerContext.runInTransactionForDatabaseAdaptorFlavorAsync(
        'postgres',
        async (queryContext) => {
          queryContext.appendPostCommitCallback(postCommitCallback);
          queryContext.appendPostCommitInvalidationCallback(postCommitInvalidationCallback);
          queryContext.appendPreCommitCallback(preCommitSecondCallback, 2);
          queryContext.appendPreCommitCallback(preCommitFirstCallback, 1);
        },
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
          },
        ),
      ).rejects.toThrowError('wat');

      expect(preCommitCallback).toHaveBeenCalledTimes(1);
      expect(postCommitCallback).toHaveBeenCalledTimes(0);
      expect(postCommitInvalidationCallback).toHaveBeenCalledTimes(0);
    });

    it('calls callbacks correctly for nested transactions', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);

      const preCommitCallback = jest.fn(async (): Promise<void> => {});
      const preCommitNestedCallback = jest.fn(async (): Promise<void> => {});
      const preCommitNestedCallbackThrow = jest.fn(async (): Promise<void> => {
        throw new Error('wat');
      });
      const postCommitInvalidationCallback = jest.fn(async (): Promise<void> => {});
      const postCommitNestedInvalidationCallback = jest.fn(async (): Promise<void> => {});
      const postCommitCallback = jest.fn(async (): Promise<void> => {});
      const postCommitNestedCallback = jest.fn(async (): Promise<void> => {});

      await viewerContext.runInTransactionForDatabaseAdaptorFlavorAsync(
        'postgres',
        async (queryContext) => {
          queryContext.appendPostCommitCallback(postCommitCallback);
          queryContext.appendPostCommitInvalidationCallback(postCommitInvalidationCallback);
          queryContext.appendPreCommitCallback(preCommitCallback, 0);

          await Promise.all([
            queryContext.runInNestedTransactionAsync(async (innerQueryContext) => {
              innerQueryContext.appendPostCommitCallback(postCommitNestedCallback);
              innerQueryContext.appendPostCommitInvalidationCallback(
                postCommitNestedInvalidationCallback,
              );
              innerQueryContext.appendPreCommitCallback(preCommitNestedCallback, 0);
            }),
            (async () => {
              try {
                await queryContext.runInNestedTransactionAsync(async (innerQueryContext) => {
                  // these two shouldn't be called due to throwing pre-commit callback
                  innerQueryContext.appendPostCommitCallback(postCommitNestedCallback);
                  innerQueryContext.appendPostCommitInvalidationCallback(
                    postCommitNestedInvalidationCallback,
                  );
                  innerQueryContext.appendPreCommitCallback(preCommitNestedCallbackThrow, 0);
                });
              } catch {}
            })(),
          ]);
        },
      );

      expect(preCommitCallback).toHaveBeenCalledTimes(1);
      expect(preCommitNestedCallback).toHaveBeenCalledTimes(1);
      expect(preCommitNestedCallbackThrow).toHaveBeenCalledTimes(1);
      expect(postCommitCallback).toHaveBeenCalledTimes(1);
      expect(postCommitInvalidationCallback).toHaveBeenCalledTimes(1);
      expect(postCommitNestedInvalidationCallback).toHaveBeenCalledTimes(2);
      expect(postCommitNestedCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('transaction config', () => {
    it('passes it into the provider', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);

      const queryContextProvider =
        companionProvider.getQueryContextProviderForDatabaseAdaptorFlavor('postgres');
      const queryContextProviderSpy = jest.spyOn(queryContextProvider, 'runInTransactionAsync');

      const transactionScopeFn = async (): Promise<any> => {};
      const transactionConfig = { isolationLevel: TransactionIsolationLevel.SERIALIZABLE };

      await viewerContext.runInTransactionForDatabaseAdaptorFlavorAsync(
        'postgres',
        transactionScopeFn,
        transactionConfig,
      );

      expect(queryContextProviderSpy).toHaveBeenCalledWith(transactionScopeFn, transactionConfig);
    });

    it('makes the result query context enable/disable transactional dataloaders', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);

      await viewerContext.runInTransactionForDatabaseAdaptorFlavorAsync(
        'postgres',
        async (queryContext) => {
          assert(queryContext.isInTransaction());
          expect(queryContext.transactionalDataLoaderMode).toBe(
            TransactionalDataLoaderMode.DISABLED,
          );
        },
        { transactionalDataLoaderMode: TransactionalDataLoaderMode.DISABLED },
      );

      await viewerContext.runInTransactionForDatabaseAdaptorFlavorAsync(
        'postgres',
        async (queryContext) => {
          assert(queryContext.isInTransaction());
          expect(queryContext.transactionalDataLoaderMode).toBe(
            TransactionalDataLoaderMode.ENABLED_BATCH_ONLY,
          );
        },
        { transactionalDataLoaderMode: TransactionalDataLoaderMode.ENABLED_BATCH_ONLY },
      );

      await viewerContext.runInTransactionForDatabaseAdaptorFlavorAsync(
        'postgres',
        async (queryContext) => {
          assert(queryContext.isInTransaction());
          expect(queryContext.transactionalDataLoaderMode).toBe(
            TransactionalDataLoaderMode.ENABLED,
          );
        },
      );
    });
  });

  describe('global defaultTransactionalDataLoaderMode', () => {
    class StubQueryContextProviderWithDisabledTransactionalDataLoaders extends EntityQueryContextProvider {
      protected getQueryInterface(): any {
        return {};
      }

      protected override defaultTransactionalDataLoaderMode(): TransactionalDataLoaderMode {
        return TransactionalDataLoaderMode.DISABLED;
      }

      protected createTransactionRunner<T>(
        _transactionConfig?: TransactionConfig,
      ): (transactionScope: (queryInterface: any) => Promise<T>) => Promise<T> {
        return (transactionScope) => Promise.resolve(transactionScope({}));
      }

      protected createNestedTransactionRunner<T>(
        _outerQueryInterface: any,
      ): (transactionScope: (queryInterface: any) => Promise<T>) => Promise<T> {
        return (transactionScope) => Promise.resolve(transactionScope({}));
      }
    }

    it('respects the global setting but allows overriding by transaction config', async () => {
      const companionProvider = new EntityCompanionProvider(
        new NoOpEntityMetricsAdapter(),
        new Map([
          [
            'postgres',
            {
              adapterProvider: new StubDatabaseAdapterProvider(),
              queryContextProvider:
                new StubQueryContextProviderWithDisabledTransactionalDataLoaders(),
            },
          ],
        ]),
        new Map([
          [
            'redis',
            {
              cacheAdapterProvider: new InMemoryFullCacheStubCacheAdapterProvider(),
            },
          ],
        ]),
      );
      const viewerContext = new ViewerContext(companionProvider);

      await viewerContext.runInTransactionForDatabaseAdaptorFlavorAsync(
        'postgres',
        async (queryContext) => {
          assert(queryContext.isInTransaction());
          expect(queryContext.transactionalDataLoaderMode).toBe(
            TransactionalDataLoaderMode.DISABLED,
          );
        },
        { transactionalDataLoaderMode: TransactionalDataLoaderMode.DISABLED },
      );

      await viewerContext.runInTransactionForDatabaseAdaptorFlavorAsync(
        'postgres',
        async (queryContext) => {
          assert(queryContext.isInTransaction());
          expect(queryContext.transactionalDataLoaderMode).toBe(
            TransactionalDataLoaderMode.ENABLED_BATCH_ONLY,
          );
        },
        { transactionalDataLoaderMode: TransactionalDataLoaderMode.ENABLED_BATCH_ONLY },
      );

      await viewerContext.runInTransactionForDatabaseAdaptorFlavorAsync(
        'postgres',
        async (queryContext) => {
          assert(queryContext.isInTransaction());
          expect(queryContext.transactionalDataLoaderMode).toBe(
            TransactionalDataLoaderMode.DISABLED,
          );
        },
      );
    });
  });
});

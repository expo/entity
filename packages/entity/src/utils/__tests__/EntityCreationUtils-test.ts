import { describe, expect, it, jest } from '@jest/globals';

import { EntityCompanionProvider } from '../../EntityCompanionProvider.ts';
import type { EntityQueryContext } from '../../EntityQueryContext.ts';
import { ViewerContext } from '../../ViewerContext.ts';
import { EntityDatabaseAdapterUniqueConstraintError } from '../../errors/EntityDatabaseAdapterError.ts';
import { EntityNotFoundError } from '../../errors/EntityNotFoundError.ts';
import { NoOpEntityMetricsAdapter } from '../../metrics/NoOpEntityMetricsAdapter.ts';
import {
  createOrGetExistingAsync,
  createWithUniqueConstraintRecoveryAsync,
} from '../EntityCreationUtils.ts';
import {
  SimpleTestEntity,
  simpleTestEntityConfiguration,
} from '../__testfixtures__/SimpleTestEntity.ts';
import { NoCacheStubCacheAdapterProvider } from '../__testfixtures__/StubCacheAdapter.ts';
import { StubDatabaseAdapterProvider } from '../__testfixtures__/StubDatabaseAdapterProvider.ts';
import { StubQueryContextProvider } from '../__testfixtures__/StubQueryContextProvider.ts';
import { createUnitTestEntityCompanionProvider } from '../__testfixtures__/createUnitTestEntityCompanionProvider.ts';

type TArgs = object;

describe.each([true, false])('in transaction %p', (inTransaction) => {
  describe(createOrGetExistingAsync, () => {
    it('does not create when already exists', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);

      const entity = await SimpleTestEntity.creator(viewerContext).createAsync();

      const args: TArgs = {};

      const getFn = jest.fn(
        async (_vc: ViewerContext, _args: TArgs, _queryContext?: EntityQueryContext) => {
          return entity;
        },
      );

      const createFn = jest.fn(
        async (vc: ViewerContext, _args: TArgs, queryContext?: EntityQueryContext) => {
          return await SimpleTestEntity.creator(vc, queryContext).createAsync();
        },
      );

      if (inTransaction) {
        await viewerContext.runInTransactionForDatabaseAdapterFlavorAsync(
          'postgres',
          async (queryContext) => {
            await createOrGetExistingAsync(
              viewerContext,
              SimpleTestEntity,
              getFn,
              args,
              createFn,
              args,
              queryContext,
            );
          },
        );
      } else {
        await createOrGetExistingAsync(
          viewerContext,
          SimpleTestEntity,
          getFn,
          args,
          createFn,
          args,
        );
      }

      expect(getFn).toHaveBeenCalledTimes(1);
      expect(createFn).toHaveBeenCalledTimes(0);
    });

    it('creates when not found', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);

      const args: TArgs = {};

      const getFn = jest.fn(
        async (_vc: ViewerContext, _args: TArgs, _queryContext?: EntityQueryContext) => {
          return null;
        },
      );

      const createFn = jest.fn(
        async (vc: ViewerContext, _args: TArgs, queryContext?: EntityQueryContext) => {
          return await SimpleTestEntity.creator(vc, queryContext).createAsync();
        },
      );

      if (inTransaction) {
        await viewerContext.runInTransactionForDatabaseAdapterFlavorAsync(
          'postgres',
          async (queryContext) => {
            await createOrGetExistingAsync(
              viewerContext,
              SimpleTestEntity,
              getFn,
              args,
              createFn,
              args,
              queryContext,
            );
          },
        );
      } else {
        await createOrGetExistingAsync(
          viewerContext,
          SimpleTestEntity,
          getFn,
          args,
          createFn,
          args,
        );
      }

      expect(getFn).toHaveBeenCalledTimes(1);
      expect(createFn).toHaveBeenCalledTimes(1);
    });
  });

  describe(createWithUniqueConstraintRecoveryAsync, () => {
    it('does not call get when creation succeeds', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);

      const args: TArgs = {};

      const getFn = jest.fn(
        async (_vc: ViewerContext, _args: TArgs, _queryContext?: EntityQueryContext) => {
          return null;
        },
      );

      const createFn = jest.fn(
        async (vc: ViewerContext, _args: TArgs, queryContext?: EntityQueryContext) => {
          return await SimpleTestEntity.creator(vc, queryContext).createAsync();
        },
      );

      if (inTransaction) {
        await viewerContext.runInTransactionForDatabaseAdapterFlavorAsync(
          'postgres',
          async (queryContext) => {
            await createWithUniqueConstraintRecoveryAsync(
              viewerContext,
              SimpleTestEntity,
              getFn,
              args,
              createFn,
              args,
              queryContext,
            );
          },
        );
      } else {
        await createWithUniqueConstraintRecoveryAsync(
          viewerContext,
          SimpleTestEntity,
          getFn,
          args,
          createFn,
          args,
        );
      }

      expect(getFn).toHaveBeenCalledTimes(0);
      expect(createFn).toHaveBeenCalledTimes(1);
    });

    it('calls get when database adapter throws EntityDatabaseAdapterUniqueConstraintError', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);

      const entity = await SimpleTestEntity.creator(viewerContext).createAsync();

      const args: TArgs = {};

      const getFn = jest.fn(
        async (_vc: ViewerContext, _args: TArgs, _queryContext?: EntityQueryContext) => {
          return entity;
        },
      );

      const createFn = jest.fn(
        async (_vc: ViewerContext, _args: TArgs, _queryContext?: EntityQueryContext) => {
          throw new EntityDatabaseAdapterUniqueConstraintError('wat');
        },
      );

      if (inTransaction) {
        await viewerContext.runInTransactionForDatabaseAdapterFlavorAsync(
          'postgres',
          async (queryContext) => {
            await createWithUniqueConstraintRecoveryAsync(
              viewerContext,
              SimpleTestEntity,
              getFn,
              args,
              createFn,
              args,
              queryContext,
            );
          },
        );
      } else {
        await createWithUniqueConstraintRecoveryAsync(
          viewerContext,
          SimpleTestEntity,
          getFn,
          args,
          createFn,
          args,
        );
      }

      expect(getFn).toHaveBeenCalledTimes(1);
      expect(createFn).toHaveBeenCalledTimes(1);
    });

    it('throws an EntityNotFoundError when database adapter throws EntityDatabaseAdapterUniqueConstraintError and getFn returns null', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);

      const args: TArgs = {};

      const getFn = jest.fn(
        async (_vc: ViewerContext, _args: TArgs, _queryContext?: EntityQueryContext) => {
          return null;
        },
      );

      const createFn = jest.fn(
        async (_vc: ViewerContext, _args: TArgs, _queryContext?: EntityQueryContext) => {
          throw new EntityDatabaseAdapterUniqueConstraintError('wat');
        },
      );

      if (inTransaction) {
        await expect(
          viewerContext.runInTransactionForDatabaseAdapterFlavorAsync(
            'postgres',
            async (queryContext) => {
              return await createWithUniqueConstraintRecoveryAsync(
                viewerContext,
                SimpleTestEntity,
                getFn,
                args,
                createFn,
                args,
                queryContext,
              );
            },
          ),
        ).rejects.toThrow(EntityNotFoundError);
      } else {
        await expect(
          createWithUniqueConstraintRecoveryAsync(
            viewerContext,
            SimpleTestEntity,
            getFn,
            args,
            createFn,
            args,
          ),
        ).rejects.toThrow(EntityNotFoundError);
      }

      expect(getFn).toHaveBeenCalledTimes(1);
      expect(createFn).toHaveBeenCalledTimes(1);
    });

    it('rethrows whatever error is thrown from database adapter  if not EntityDatabaseAdapterUniqueConstraintError', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);

      const args: TArgs = {};

      const getFn = jest.fn(
        async (_vc: ViewerContext, _args: TArgs, _queryContext?: EntityQueryContext) => {
          return null;
        },
      );

      const createFn = jest.fn(
        async (_vc: ViewerContext, _args: TArgs, _queryContext?: EntityQueryContext) => {
          throw new Error('wat');
        },
      );

      if (inTransaction) {
        await expect(
          viewerContext.runInTransactionForDatabaseAdapterFlavorAsync(
            'postgres',
            async (queryContext) => {
              return await createWithUniqueConstraintRecoveryAsync(
                viewerContext,
                SimpleTestEntity,
                getFn,
                args,
                createFn,
                args,
                queryContext,
              );
            },
          ),
        ).rejects.toThrow('wat');
      } else {
        await expect(
          createWithUniqueConstraintRecoveryAsync(
            viewerContext,
            SimpleTestEntity,
            getFn,
            args,
            createFn,
            args,
          ),
        ).rejects.toThrow('wat');
      }

      expect(getFn).toHaveBeenCalledTimes(0);
      expect(createFn).toHaveBeenCalledTimes(1);
    });
  });
});

describe('non-transactional query context scoping', () => {
  it('does not reuse a negative dataloader entry from the initial get during unique constraint recovery', async () => {
    const queryContextProvider = new StubQueryContextProvider();
    const databaseAdapterProvider = new StubDatabaseAdapterProvider();
    const companionProvider = new EntityCompanionProvider(
      new NoOpEntityMetricsAdapter(),
      new Map([
        [
          'postgres',
          {
            adapterProvider: databaseAdapterProvider,
            queryContextProvider,
          },
        ],
      ]),
      new Map([
        [
          'redis',
          {
            cacheAdapterProvider: new NoCacheStubCacheAdapterProvider(),
          },
        ],
      ]),
    );
    const viewerContext = new ViewerContext(companionProvider);
    const args = { id: '00000000-0000-7000-8000-000000000001' };

    const getFn = jest.fn(
      async (vc: ViewerContext, getArgs: typeof args, queryContext?: EntityQueryContext) => {
        return await SimpleTestEntity.loader(vc, queryContext).loadByIDNullableAsync(getArgs.id);
      },
    );

    const createFn = jest.fn(
      async (
        _vc: ViewerContext,
        createArgs: typeof args,
        queryContext?: EntityQueryContext,
      ): Promise<SimpleTestEntity> => {
        await databaseAdapterProvider
          .getDatabaseAdapter(simpleTestEntityConfiguration)
          .insertAsync(queryContext ?? queryContextProvider.getQueryContext(), {
            id: createArgs.id,
          });
        throw new EntityDatabaseAdapterUniqueConstraintError('duplicate');
      },
    );

    const entity = await createOrGetExistingAsync(
      viewerContext,
      SimpleTestEntity,
      getFn,
      args,
      createFn,
      args,
    );

    expect(entity.getID()).toBe(args.id);
    expect(getFn).toHaveBeenCalledTimes(2);
    expect(createFn).toHaveBeenCalledTimes(1);
  });
});

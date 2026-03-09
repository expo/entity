import { describe, expect, it, jest } from '@jest/globals';

import type { EntityTransactionalQueryContext } from '../../EntityQueryContext.ts';
import { ViewerContext } from '../../ViewerContext.ts';
import { EntityDatabaseAdapterUniqueConstraintError } from '../../errors/EntityDatabaseAdapterError.ts';
import { EntityNotFoundError } from '../../errors/EntityNotFoundError.ts';
import {
  createOrGetExistingAsync,
  createWithUniqueConstraintRecoveryAsync,
} from '../EntityCreationUtils.ts';
import { SimpleTestEntity } from '../__testfixtures__/SimpleTestEntity.ts';
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
        async (
          _vc: ViewerContext,
          _args: TArgs,
          _queryContext?: EntityTransactionalQueryContext,
        ) => {
          return entity;
        },
      );

      const createFn = jest.fn(
        async (vc: ViewerContext, _args: TArgs, queryContext?: EntityTransactionalQueryContext) => {
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
        async (
          _vc: ViewerContext,
          _args: TArgs,
          _queryContext?: EntityTransactionalQueryContext,
        ) => {
          return null;
        },
      );

      const createFn = jest.fn(
        async (vc: ViewerContext, _args: TArgs, queryContext?: EntityTransactionalQueryContext) => {
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
        async (
          _vc: ViewerContext,
          _args: TArgs,
          _queryContext?: EntityTransactionalQueryContext,
        ) => {
          return null;
        },
      );

      const createFn = jest.fn(
        async (vc: ViewerContext, _args: TArgs, queryContext?: EntityTransactionalQueryContext) => {
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
        async (
          _vc: ViewerContext,
          _args: TArgs,
          _queryContext?: EntityTransactionalQueryContext,
        ) => {
          return entity;
        },
      );

      const createFn = jest.fn(
        async (
          _vc: ViewerContext,
          _args: TArgs,
          _queryContext?: EntityTransactionalQueryContext,
        ) => {
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
        async (
          _vc: ViewerContext,
          _args: TArgs,
          _queryContext?: EntityTransactionalQueryContext,
        ) => {
          return null;
        },
      );

      const createFn = jest.fn(
        async (
          _vc: ViewerContext,
          _args: TArgs,
          _queryContext?: EntityTransactionalQueryContext,
        ) => {
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
        async (
          _vc: ViewerContext,
          _args: TArgs,
          _queryContext?: EntityTransactionalQueryContext,
        ) => {
          return null;
        },
      );

      const createFn = jest.fn(
        async (
          _vc: ViewerContext,
          _args: TArgs,
          _queryContext?: EntityTransactionalQueryContext,
        ) => {
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

import { ViewerContext } from '@expo/entity';
import { knex, Knex } from 'knex';
import nullthrows from 'nullthrows';

import PostgresEntityQueryContextProvider from '../PostgresEntityQueryContextProvider';
import PostgresUniqueTestEntity from '../__testfixtures__/PostgresUniqueTestEntity';
import { createKnexIntegrationTestEntityCompanionProvider } from '../__testfixtures__/createKnexIntegrationTestEntityCompanionProvider';

describe(PostgresEntityQueryContextProvider, () => {
  let knexInstance: Knex;

  beforeAll(() => {
    knexInstance = knex({
      client: 'pg',
      connection: {
        user: nullthrows(process.env['PGUSER']),
        password: nullthrows(process.env['PGPASSWORD']),
        host: 'localhost',
        port: parseInt(nullthrows(process.env['PGPORT']), 10),
        database: nullthrows(process.env['PGDATABASE']),
      },
    });
  });

  beforeEach(async () => {
    await PostgresUniqueTestEntity.createOrTruncatePostgresTableAsync(knexInstance);
  });

  afterAll(async () => {
    await PostgresUniqueTestEntity.dropPostgresTableAsync(knexInstance);
    await knexInstance.destroy();
  });

  it('supports nested transactions', async () => {
    const vc1 = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));

    await PostgresUniqueTestEntity.creator(vc1).setField('name', 'unique').createAsync();

    const id = (
      await PostgresUniqueTestEntity.creator(vc1).setField('name', 'wat').createAsync()
    ).getID();

    await vc1.runInTransactionForDatabaseAdaptorFlavorAsync('postgres', async (queryContext) => {
      const entity = await PostgresUniqueTestEntity.loader(vc1, queryContext).loadByIDAsync(id);
      await PostgresUniqueTestEntity.updater(entity, queryContext)
        .setField('name', 'wat2')
        .updateAsync();

      // ensure the outer transaction is not aborted due to postgres error in inner transaction,
      // in this case the error triggered is a unique constraint violation from a conflict with the first entity created above
      try {
        await queryContext.runInNestedTransactionAsync(async (innerQueryContext) => {
          const entity = await PostgresUniqueTestEntity.loader(
            vc1,
            innerQueryContext,
          ).loadByIDAsync(id);
          await PostgresUniqueTestEntity.updater(entity, innerQueryContext)
            .setField('name', 'unique')
            .updateAsync();
        });
      } catch {}

      const entity2 = await PostgresUniqueTestEntity.loader(vc1, queryContext).loadByIDAsync(id);
      await PostgresUniqueTestEntity.updater(entity2, queryContext)
        .setField('name', 'wat3')
        .updateAsync();
    });

    const entityLoaded = await PostgresUniqueTestEntity.loader(vc1).loadByIDAsync(id);
    expect(entityLoaded.getField('name')).toEqual('wat3');
  });

  test('dataloader consistency with nested transactions', async () => {
    const vc1 = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));

    // put it in local dataloader
    const entity = await PostgresUniqueTestEntity.creator(vc1)
      .setField('name', 'who')
      .createAsync();
    const entityLoaded = await PostgresUniqueTestEntity.loader(vc1).loadByIDAsync(entity.getID());
    expect(entityLoaded.getField('name')).toEqual('who');

    await vc1.runInTransactionForDatabaseAdaptorFlavorAsync('postgres', async (queryContext) => {
      const entityLoadedOuter = await PostgresUniqueTestEntity.loader(vc1).loadByIDAsync(
        entity.getID(),
      );
      expect(entityLoadedOuter.getField('name')).toEqual('who');

      await queryContext.runInNestedTransactionAsync(async (innerQueryContext) => {
        const entityLoadedInner = await PostgresUniqueTestEntity.loader(
          vc1,
          innerQueryContext,
        ).loadByIDAsync(entity.getID());
        const updatedEntity = await PostgresUniqueTestEntity.updater(
          entityLoadedInner,
          innerQueryContext,
        )
          .setField('name', 'wat')
          .updateAsync();
        expect(updatedEntity.getField('name')).toEqual('wat');
      });

      const entityLoadedAfterNested = await PostgresUniqueTestEntity.loader(
        vc1,
        queryContext,
      ).loadByIDAsync(entity.getID());
      expect(entityLoadedAfterNested.getField('name')).toEqual('wat');
    });

    const entityLoadedAfterTransaction = await PostgresUniqueTestEntity.loader(vc1).loadByIDAsync(
      entity.getID(),
    );
    expect(entityLoadedAfterTransaction.getField('name')).toEqual('wat');
  });

  test('dataloader consistency with nested transactions that throw', async () => {
    const vc1 = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));

    // put it in local dataloader
    const entity = await PostgresUniqueTestEntity.creator(vc1)
      .setField('name', 'who')
      .createAsync();
    const entityLoaded = await PostgresUniqueTestEntity.loader(vc1).loadByIDAsync(entity.getID());
    expect(entityLoaded.getField('name')).toEqual('who');

    await vc1.runInTransactionForDatabaseAdaptorFlavorAsync('postgres', async (queryContext) => {
      const entityLoadedOuter = await PostgresUniqueTestEntity.loader(vc1).loadByIDAsync(
        entity.getID(),
      );
      expect(entityLoadedOuter.getField('name')).toEqual('who');

      try {
        await queryContext.runInNestedTransactionAsync(async (innerQueryContext) => {
          const entityLoadedInner = await PostgresUniqueTestEntity.loader(
            vc1,
            innerQueryContext,
          ).loadByIDAsync(entity.getID());
          const updatedEntity = await PostgresUniqueTestEntity.updater(
            entityLoadedInner,
            innerQueryContext,
          )
            .setField('name', 'wat')
            .updateAsync();
          expect(updatedEntity.getField('name')).toEqual('wat');
          throw new Error('wat');
        });
      } catch {}

      const entityLoadedAfterNested = await PostgresUniqueTestEntity.loader(
        vc1,
        queryContext,
      ).loadByIDAsync(entity.getID());
      expect(entityLoadedAfterNested.getField('name')).toEqual('who');
    });

    const entityLoadedAfterTransaction = await PostgresUniqueTestEntity.loader(vc1).loadByIDAsync(
      entity.getID(),
    );
    expect(entityLoadedAfterTransaction.getField('name')).toEqual('who');
  });

  test('dataloader consistency with concurrent loads outside of transaction', async () => {
    const vc1 = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));

    // put it in local dataloader
    const entity = await PostgresUniqueTestEntity.creator(vc1)
      .setField('name', 'who')
      .createAsync();
    const entityLoaded = await PostgresUniqueTestEntity.loader(vc1).loadByIDAsync(entity.getID());
    expect(entityLoaded.getField('name')).toEqual('who');

    let openBarrier1: () => void;
    const barrier1 = new Promise<void>((resolve) => {
      openBarrier1 = resolve;
    });

    let openBarrier2: () => void;
    const barrier2 = new Promise<void>((resolve) => {
      openBarrier2 = resolve;
    });

    await Promise.all([
      vc1.runInTransactionForDatabaseAdaptorFlavorAsync('postgres', async (queryContext) => {
        const entityLoadedOuter = await PostgresUniqueTestEntity.loader(vc1).loadByIDAsync(
          entity.getID(),
        );
        expect(entityLoadedOuter.getField('name')).toEqual('who');

        await queryContext.runInNestedTransactionAsync(async (innerQueryContext) => {
          const entityLoadedInner = await PostgresUniqueTestEntity.loader(
            vc1,
            innerQueryContext,
          ).loadByIDAsync(entity.getID());
          const updatedEntity = await PostgresUniqueTestEntity.updater(
            entityLoadedInner,
            innerQueryContext,
          )
            .setField('name', 'wat')
            .updateAsync();
          expect(updatedEntity.getField('name')).toEqual('wat');
          const entityLoadedAfterUpdate = await PostgresUniqueTestEntity.loader(
            vc1,
            innerQueryContext,
          ).loadByIDAsync(entity.getID());
          expect(entityLoadedAfterUpdate.getField('name')).toEqual('wat');
        });
        openBarrier1();
        await barrier2;
      }),
      (async () => {
        await barrier1;

        const entityLoadedOutsideOfTransactionsBeforeNestedCommit =
          await PostgresUniqueTestEntity.loader(vc1).loadByIDAsync(entity.getID());
        expect(entityLoadedOutsideOfTransactionsBeforeNestedCommit.getField('name')).toEqual('who');
        openBarrier2!();
      })(),
    ]);

    const entityLoadedAfterTransaction = await PostgresUniqueTestEntity.loader(vc1).loadByIDAsync(
      entity.getID(),
    );
    expect(entityLoadedAfterTransaction.getField('name')).toEqual('wat');
  });

  test('consistent behavior with and without transactional dataloader for concurrent loads outside of nested transaction', async () => {
    // Subtransactions are not supported in postgres. See #194 for more info.
    // Instead, savepoints and rollbacks are used to simulate subtransactions, which results in non-isolated read semantics.
    //
    // This test tests the same behavior exists whether there is a dataloader or not in transactions, thus indicating that
    // the dataloader invalidation is not the issue.

    const runTest = async (shouldDisableTransactionalDataloader: boolean): Promise<void> => {
      const vc1 = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));
      await vc1.runInTransactionForDatabaseAdaptorFlavorAsync(
        'postgres',
        async (outerQueryContext) => {
          // put it in local dataloader
          const entity = await PostgresUniqueTestEntity.creator(vc1, outerQueryContext)
            .setField('name', 'who')
            .createAsync();
          const entityLoaded = await PostgresUniqueTestEntity.loader(
            vc1,
            outerQueryContext,
          ).loadByIDAsync(entity.getID());
          if (entityLoaded.getField('name') !== 'who') {
            throw new Error('entity loaded wrong value');
          }

          let openBarrier1: () => void;
          const barrier1 = new Promise<void>((resolve) => {
            openBarrier1 = resolve;
          });

          let openBarrier2: () => void;
          const barrier2 = new Promise<void>((resolve) => {
            openBarrier2 = resolve;
          });

          await Promise.all([
            outerQueryContext.runInNestedTransactionAsync(async (innerQueryContext) => {
              const entityLoadedInner = await PostgresUniqueTestEntity.loader(
                vc1,
                innerQueryContext,
              ).loadByIDAsync(entity.getID());
              const updatedEntity = await PostgresUniqueTestEntity.updater(
                entityLoadedInner,
                innerQueryContext,
              )
                .setField('name', 'wat')
                .updateAsync();
              if (updatedEntity.getField('name') !== 'wat') {
                throw new Error('entity updated wrong value');
              }

              const entityLoadedAfterUpdate = await PostgresUniqueTestEntity.loader(
                vc1,
                innerQueryContext,
              ).loadByIDAsync(entity.getID());
              if (entityLoadedAfterUpdate.getField('name') !== 'wat') {
                throw new Error('entity loaded wrong value after update');
              }
              openBarrier1();
              await barrier2;
            }),
            (async () => {
              await barrier1;

              // if postgres supported nested transactions, this would read isolated from the nested transaction above
              // but since it doesn't, this will read the updated value.
              const entityLoadedInOuterTransactionBeforeNestedCommit =
                await PostgresUniqueTestEntity.loader(vc1, outerQueryContext).loadByIDAsync(
                  entity.getID(),
                );
              if (entityLoadedInOuterTransactionBeforeNestedCommit.getField('name') !== 'who') {
                throw new Error('outer transaction read wrong value');
              }

              openBarrier2!();
            })(),
          ]);

          const entityLoadedAfterTransaction = await PostgresUniqueTestEntity.loader(
            vc1,
            outerQueryContext,
          ).loadByIDAsync(entity.getID());
          if (entityLoadedAfterTransaction.getField('name') !== 'wat') {
            throw new Error('entity loaded wrong value after transaction');
          }
        },
        { disableTransactionalDataloader: shouldDisableTransactionalDataloader },
      );
    };

    await expect(runTest(true)).rejects.toThrow('outer transaction read wrong value');
    await expect(runTest(false)).rejects.toThrow('outer transaction read wrong value');
  });

  test('consistent behavior with and without transactional dataloader for concurrent mutations outside of nested transaction that reads', async () => {
    // this test has a similar issue to the one above: absence of real nested transactions in postgres
    // this should have the same behavior no matter if there is a dataloader or not in transactions

    const runTest = async (shouldDisableTransactionalDataloader: boolean): Promise<void> => {
      const vc1 = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));
      await vc1.runInTransactionForDatabaseAdaptorFlavorAsync(
        'postgres',
        async (outerQueryContext) => {
          // put it in local dataloader
          const entity = await PostgresUniqueTestEntity.creator(vc1, outerQueryContext)
            .setField('name', 'who')
            .createAsync();
          const entityLoaded = await PostgresUniqueTestEntity.loader(
            vc1,
            outerQueryContext,
          ).loadByIDAsync(entity.getID());
          if (entityLoaded.getField('name') !== 'who') {
            throw new Error('entity loaded wrong value');
          }

          let openBarrier1: () => void;
          const barrier1 = new Promise<void>((resolve) => {
            openBarrier1 = resolve;
          });

          let openBarrier2: () => void;
          const barrier2 = new Promise<void>((resolve) => {
            openBarrier2 = resolve;
          });

          await Promise.all([
            (async () => {
              await barrier1;

              const entityLoadedOuterAgain = await PostgresUniqueTestEntity.loader(
                vc1,
                outerQueryContext,
              ).loadByIDAsync(entity.getID());
              const updatedEntity = await PostgresUniqueTestEntity.updater(
                entityLoadedOuterAgain,
                outerQueryContext,
              )
                .setField('name', 'wat')
                .updateAsync();
              if (updatedEntity.getField('name') !== 'wat') {
                throw new Error('entity updated wrong value');
              }

              openBarrier2!();
            })(),

            outerQueryContext.runInNestedTransactionAsync(async (innerQueryContext) => {
              const entityLoadedInner = await PostgresUniqueTestEntity.loader(
                vc1,
                innerQueryContext,
              ).loadByIDAsync(entity.getID());
              if (entityLoadedInner.getField('name') !== 'who') {
                throw new Error('entity loaded inner wrong value 1');
              }

              openBarrier1();
              await barrier2;

              const entityLoadedInnerAgain = await PostgresUniqueTestEntity.loader(
                vc1,
                innerQueryContext,
              ).loadByIDAsync(entity.getID());
              if (entityLoadedInnerAgain.getField('name') !== 'who') {
                throw new Error('entity loaded inner wrong value 2');
              }
            }),
          ]);

          const entityLoadedAfterTransaction = await PostgresUniqueTestEntity.loader(
            vc1,
            outerQueryContext,
          ).loadByIDAsync(entity.getID());
          if (entityLoadedAfterTransaction.getField('name') !== 'wat') {
            throw new Error('entity loaded wrong value after transaction');
          }
        },
        { disableTransactionalDataloader: shouldDisableTransactionalDataloader },
      );
    };

    await expect(runTest(true)).rejects.toThrow('entity loaded inner wrong value 2');
    await expect(runTest(false)).rejects.toThrow('entity loaded inner wrong value 2');
  });

  it('supports multi-nested transactions', async () => {
    const vc1 = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));

    const id = (
      await PostgresUniqueTestEntity.creator(vc1).setField('name', 'wat').createAsync()
    ).getID();

    await vc1.runInTransactionForDatabaseAdaptorFlavorAsync('postgres', async (queryContext) => {
      await queryContext.runInNestedTransactionAsync(async (innerQueryContext) => {
        await innerQueryContext.runInNestedTransactionAsync(async (innerQueryContex2) => {
          await innerQueryContex2.runInNestedTransactionAsync(async (innerQueryContex3) => {
            const entity = await PostgresUniqueTestEntity.loader(
              vc1,
              innerQueryContex3,
            ).loadByIDAsync(id);
            await PostgresUniqueTestEntity.updater(entity, innerQueryContex3)
              .setField('name', 'wat3')
              .updateAsync();
          });
        });
      });
    });

    const entityLoaded = await PostgresUniqueTestEntity.loader(vc1).loadByIDAsync(id);
    expect(entityLoaded.getField('name')).toEqual('wat3');
  });
});

import assert from 'assert';

import EntityQueryContextProvider from './EntityQueryContextProvider';

export type PostCommitCallback = (...args: any) => Promise<any>;
export type PreCommitCallback<
  TQueryInterface = any,
  TTransactionalQueryInterface extends TQueryInterface = any,
> = (
  queryContext: EntityTransactionalQueryContext<TQueryInterface, TTransactionalQueryInterface>,
  ...args: any
) => Promise<any>;

export enum TransactionIsolationLevel {
  READ_COMMITTED = 'READ_COMMITTED',
  REPEATABLE_READ = 'REPEATABLE_READ',
  SERIALIZABLE = 'SERIALIZABLE',
}

export type TransactionConfig = {
  isolationLevel?: TransactionIsolationLevel;
  disableTransactionalDataloader?: boolean;
};

/**
 * Entity framework representation of transactional and non-transactional database
 * query execution units.
 *
 * The behavior of EntityMutator and EntityLoader
 * differs when in a transactional context.
 */
export abstract class EntityQueryContext<
  TQueryInterface = any,
  TTransactionalQueryInterface extends TQueryInterface = any,
> {
  constructor(private readonly queryInterface: TQueryInterface | TTransactionalQueryInterface) {}

  abstract isInTransaction(): this is EntityTransactionalQueryContext<
    TQueryInterface,
    TTransactionalQueryInterface
  >;

  getQueryInterface(): TQueryInterface | TTransactionalQueryInterface {
    return this.queryInterface;
  }

  abstract runInTransactionIfNotInTransactionAsync<T>(
    transactionScope: (
      queryContext: EntityTransactionalQueryContext<TQueryInterface, TTransactionalQueryInterface>,
    ) => Promise<T>,
    transactionConfig?: TransactionConfig,
  ): Promise<T>;
}

/**
 * Entity framework representation of a non-transactional query execution unit.
 * When supplied to EntityMutator and EntityLoader methods, they will be
 * run independently of any running transaction (though mutations start their own
 * independent transactions internally when not being run in a transaction).
 */
export class EntityNonTransactionalQueryContext<
  TQueryInterface = any,
  TTransactionalQueryInterface extends TQueryInterface = any,
> extends EntityQueryContext<TQueryInterface, TTransactionalQueryInterface> {
  constructor(
    queryInterface: TQueryInterface,
    private readonly entityQueryContextProvider: EntityQueryContextProvider<
      TQueryInterface,
      TTransactionalQueryInterface
    >,
  ) {
    super(queryInterface);
  }

  override isInTransaction(): this is EntityTransactionalQueryContext<
    TQueryInterface,
    TTransactionalQueryInterface
  > {
    return false;
  }

  async runInTransactionIfNotInTransactionAsync<T>(
    transactionScope: (
      queryContext: EntityTransactionalQueryContext<TQueryInterface, TTransactionalQueryInterface>,
    ) => Promise<T>,
    transactionConfig?: TransactionConfig,
  ): Promise<T> {
    return await this.entityQueryContextProvider.runInTransactionAsync(
      transactionScope,
      transactionConfig,
    );
  }
}

/**
 * Entity framework representation of a transactional query execution unit. When supplied
 * to EntityMutator and EntityLoader methods, those methods and their
 * dependent triggers and validators will run within the transaction.
 */
export class EntityTransactionalQueryContext<
  TQueryInterface = any,
  TTransactionalQueryInterface extends TQueryInterface = any,
> extends EntityQueryContext<TQueryInterface, TTransactionalQueryInterface> {
  /**
   * @internal
   */
  public readonly childQueryContexts: EntityNestedTransactionalQueryContext<
    TQueryInterface,
    TTransactionalQueryInterface
  >[] = [];

  private readonly postCommitInvalidationCallbacks: PostCommitCallback[] = [];
  private readonly postCommitCallbacks: PostCommitCallback[] = [];

  private readonly preCommitCallbacks: {
    callback: PreCommitCallback<TQueryInterface, TTransactionalQueryInterface>;
    order: number;
  }[] = [];

  constructor(
    queryInterface: TTransactionalQueryInterface,
    private readonly entityQueryContextProvider: EntityQueryContextProvider<
      TQueryInterface,
      TTransactionalQueryInterface
    >,
    /**
     * @internal
     */
    readonly transactionId: string,
    public readonly shouldDisableTransactionalDataloader: boolean,
  ) {
    super(queryInterface);
  }

  override getQueryInterface(): TTransactionalQueryInterface {
    return super.getQueryInterface() as TTransactionalQueryInterface;
  }

  isCompleted(): boolean {
    return this.entityQueryContextProvider.isQueryInterfaceTransactionAndCompleted(
      this.getQueryInterface(),
    );
  }

  /**
   * Schedule a pre-commit callback. These will be run within the transaction right before it is
   * committed, and will be run in the order specified. Ordering of callbacks scheduled with the
   * same value for the order parameter is undefined within that ordering group.
   * @param callback - callback to schedule
   * @param order - order in which this should be run relative to other scheduled pre-commit callbacks,
   *                with higher numbers running later than lower numbers.
   */
  public appendPreCommitCallback(
    callback: PreCommitCallback<TQueryInterface, TTransactionalQueryInterface>,
    order: number,
  ): void {
    assert(
      order >= Number.MIN_SAFE_INTEGER && order <= Number.MAX_SAFE_INTEGER,
      `Invalid order specified: ${order}`,
    );
    this.preCommitCallbacks.push({ callback, order });
  }

  /**
   * Schedule a post-commit cache invalidation callback. These are run before normal
   * post-commit callbacks in order to have cache consistency in normal post-commit callbacks.
   * @param callback - callback to schedule
   */
  public appendPostCommitInvalidationCallback(callback: PostCommitCallback): void {
    this.postCommitInvalidationCallbacks.push(callback);
  }

  /**
   * Schedule a post-commit callback. These will be run after the transaction has
   * been committed.
   * @param callback - callback to schedule
   */
  public appendPostCommitCallback(callback: PostCommitCallback): void {
    this.postCommitCallbacks.push(callback);
  }

  /**
   * @internal
   */
  public async runPreCommitCallbacksAsync(): Promise<void> {
    const callbacks = [...this.preCommitCallbacks]
      .sort((a, b) => a.order - b.order)
      .map((c) => c.callback);
    this.preCommitCallbacks.length = 0;

    for (const callback of callbacks) {
      await callback(this);
    }
  }

  /**
   * @internal
   */
  public async runPostCommitCallbacksAsync(): Promise<void> {
    const invalidationCallbacks = [...this.postCommitInvalidationCallbacks];
    this.postCommitInvalidationCallbacks.length = 0;
    await Promise.all(invalidationCallbacks.map((callback) => callback()));

    const callbacks = [...this.postCommitCallbacks];
    this.postCommitCallbacks.length = 0;
    await Promise.all(callbacks.map((callback) => callback()));
  }

  override isInTransaction(): this is EntityTransactionalQueryContext<
    TQueryInterface,
    TTransactionalQueryInterface
  > {
    return true;
  }

  isInNestedTransaction(): this is EntityNestedTransactionalQueryContext<
    TQueryInterface,
    TTransactionalQueryInterface
  > {
    return false;
  }

  async runInTransactionIfNotInTransactionAsync<T>(
    transactionScope: (
      queryContext: EntityTransactionalQueryContext<TQueryInterface, TTransactionalQueryInterface>,
    ) => Promise<T>,
    transactionConfig?: TransactionConfig,
  ): Promise<T> {
    assert(
      transactionConfig === undefined,
      'Should not pass transactionConfig to a nested transaction',
    );
    return await transactionScope(this);
  }

  async runInNestedTransactionAsync<T>(
    transactionScope: (
      innerQueryContext: EntityTransactionalQueryContext<
        TQueryInterface,
        TTransactionalQueryInterface
      >,
    ) => Promise<T>,
  ): Promise<T> {
    return await this.entityQueryContextProvider.runInNestedTransactionAsync(
      this,
      transactionScope,
    );
  }
}

/**
 * Entity framework representation of a nested transactional query execution unit. When supplied
 * to EntityMutator and EntityLoader methods, those methods and their
 * dependent triggers and validators will run within the nested transaction.
 *
 * This exists to forward post-commit callbacks to the parent query context but only after
 * successful commit of the nested transaction.
 */
export class EntityNestedTransactionalQueryContext<
  TQueryInterface = any,
  TTransactionalQueryInterface extends TQueryInterface = any,
> extends EntityTransactionalQueryContext<TQueryInterface, TTransactionalQueryInterface> {
  private readonly postCommitInvalidationCallbacksToTransfer: PostCommitCallback[] = [];
  private readonly postCommitCallbacksToTransfer: PostCommitCallback[] = [];

  constructor(
    queryInterface: TTransactionalQueryInterface,
    /**
     * @internal
     */
    readonly parentQueryContext: EntityTransactionalQueryContext<
      TQueryInterface,
      TTransactionalQueryInterface
    >,
    entityQueryContextProvider: EntityQueryContextProvider<
      TQueryInterface,
      TTransactionalQueryInterface
    >,
    transactionId: string,
    shouldDisableTransactionalDataloader: boolean,
  ) {
    super(
      queryInterface,
      entityQueryContextProvider,
      transactionId,
      shouldDisableTransactionalDataloader,
    );
    parentQueryContext.childQueryContexts.push(this);
  }

  override isInNestedTransaction(): this is EntityNestedTransactionalQueryContext<
    TQueryInterface,
    TTransactionalQueryInterface
  > {
    return true;
  }

  public override appendPostCommitCallback(callback: PostCommitCallback): void {
    // explicitly do not add to the super-class's post-commit callbacks
    // instead, we will add them to the parent transaction's post-commit callbacks
    // after the nested transaction has been committed
    this.postCommitCallbacksToTransfer.push(callback);
  }

  public override appendPostCommitInvalidationCallback(callback: PostCommitCallback): void {
    super.appendPostCommitInvalidationCallback(callback);
    this.postCommitInvalidationCallbacksToTransfer.push(callback);
  }

  /**
   * The behavior of callbacks for nested transactions are a bit different than for normal
   * transactions.
   * - Post-commit (non-invalidation) callbacks are run at the end of the outermost transaction
   *   since they often contain side-effects that only should run if the transaction doesn't roll back.
   *   The outermost transaction has the final say on the commit state of itself and all sub-transactions.
   * - Invalidation callbacks are run at the end of both the nested transaction iteself but also transferred
   *   to the parent transaction to be run at the end of it (and recurse upwards, accumulating invalations).
   *   This is to ensure the dataloader cache is never stale no matter the DBMS transaction isolation
   *   semantics. See the note in `AuthorizationResultBasedBaseMutator` for more details.
   *
   * @internal
   */
  public override async runPostCommitCallbacksAsync(): Promise<void> {
    // run the post-commit callbacks for the nested transaction now
    // (this technically also would run regular post-commit callbacks, but they are empty)
    await super.runPostCommitCallbacksAsync();

    // transfer a copy of the post-commit invalidation callbacks to the parent transaction
    // to also be run at the end of it (or recurse in the case of the parent transaction being nested as well)
    for (const callback of this.postCommitInvalidationCallbacksToTransfer) {
      this.parentQueryContext.appendPostCommitInvalidationCallback(callback);
    }

    // transfer post-commit callbacks to patent
    for (const callback of this.postCommitCallbacksToTransfer) {
      this.parentQueryContext.appendPostCommitCallback(callback);
    }
  }
}

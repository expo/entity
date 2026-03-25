import assert from 'assert';

import type { EntityQueryContextProvider } from './EntityQueryContextProvider.ts';

export type PostCommitCallback = (...args: any) => Promise<any>;
export type PreCommitCallback = (
  queryContext: EntityTransactionalQueryContext,
  ...args: any
) => Promise<any>;

/**
 * Database transaction isolation level. Controls the visibility of changes made by
 * concurrent transactions, trading off between consistency and performance.
 */
export enum TransactionIsolationLevel {
  /**
   * Each statement sees only data committed before it began. Default for most databases.
   */
  READ_COMMITTED = 'READ_COMMITTED',

  /**
   * All statements in the transaction see the same snapshot taken at the start of the transaction.
   */
  REPEATABLE_READ = 'REPEATABLE_READ',

  /**
   * Transactions execute as if they were run one at a time. Strongest guarantee but lowest throughput.
   */
  SERIALIZABLE = 'SERIALIZABLE',
}

/**
 * Controls DataLoader behavior within a transaction.
 */
export enum TransactionalDataLoaderMode {
  /**
   * Default mode where DataLoader is fully enabled, providing both batching and caching benefits within the transaction.
   */
  ENABLED = 'ENABLED',

  /**
   * DataLoader is enabled for batching queries together but does not cache results. Use this mode when you want to benefit from batching but need to ensure that each load reflects the most current database state, even within the same transaction.
   */
  ENABLED_BATCH_ONLY = 'ENABLED_BATCH_ONLY',

  /**
   * DataLoader is completely disabled for the transaction. Each load will directly query the database without any batching or caching. Use this mode when you need to ensure that every load reflects the most current database state and are not concerned about the performance benefits of batching or caching within the transaction.
   */
  DISABLED = 'DISABLED',
}

/**
 * Configuration options for running a transaction. This includes the isolation level and DataLoader mode for the transaction.
 */
export type TransactionConfig = {
  /**
   * Transaction isolation level. When omitted, the database default is used (typically READ_COMMITTED).
   */
  isolationLevel?: TransactionIsolationLevel;
  /**
   * DataLoader mode for the transaction. When omitted, defaults to ENABLED.
   */
  transactionalDataLoaderMode?: TransactionalDataLoaderMode;
};

/**
 * Resolved transaction configuration with all default values filled in.
 * This is the configuration that is actually used for a transaction after applying defaults.
 */
export type ResolvedTransactionConfig = Pick<TransactionConfig, 'isolationLevel'> &
  Required<Pick<TransactionConfig, 'transactionalDataLoaderMode'>>;

/**
 * Entity framework representation of transactional and non-transactional database
 * query execution units.
 *
 * The behavior of EntityMutator and EntityLoader
 * differs when in a transactional context.
 */
export abstract class EntityQueryContext {
  constructor(private readonly queryInterface: any) {}

  abstract isInTransaction(): this is EntityTransactionalQueryContext;

  getQueryInterface(): any {
    return this.queryInterface;
  }

  abstract runInTransactionIfNotInTransactionAsync<T>(
    transactionScope: (queryContext: EntityTransactionalQueryContext) => Promise<T>,
    transactionConfig?: TransactionConfig,
  ): Promise<T>;
}

/**
 * Entity framework representation of a non-transactional query execution unit.
 * When supplied to EntityMutator and EntityLoader methods, they will be
 * run independently of any running transaction (though mutations start their own
 * independent transactions internally when not being run in a transaction).
 */
export class EntityNonTransactionalQueryContext extends EntityQueryContext {
  constructor(
    queryInterface: any,
    private readonly entityQueryContextProvider: EntityQueryContextProvider,
  ) {
    super(queryInterface);
  }

  override isInTransaction(): this is EntityTransactionalQueryContext {
    return false;
  }

  async runInTransactionIfNotInTransactionAsync<T>(
    transactionScope: (queryContext: EntityTransactionalQueryContext) => Promise<T>,
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
export class EntityTransactionalQueryContext extends EntityQueryContext {
  /**
   * @internal
   */
  public readonly childQueryContexts: EntityNestedTransactionalQueryContext[] = [];

  private readonly postCommitInvalidationCallbacks: PostCommitCallback[] = [];
  private readonly postCommitCallbacks: PostCommitCallback[] = [];

  private readonly preCommitCallbacks: { callback: PreCommitCallback; order: number }[] = [];

  constructor(
    queryInterface: any,
    private readonly entityQueryContextProvider: EntityQueryContextProvider,
    /**
     * @internal
     */
    readonly transactionId: string,
    public readonly transactionConfig: ResolvedTransactionConfig,
  ) {
    super(queryInterface);
  }

  /**
   * DataLoader mode for this transaction set at time of transaction creation, controlling DataLoader caching and batching behavior within the transaction.
   */
  get transactionalDataLoaderMode(): TransactionalDataLoaderMode {
    return this.transactionConfig.transactionalDataLoaderMode;
  }

  /**
   * Transaction isolation level for this transaction set at time of transaction creation.
   * This controls the visibility of changes made by concurrent transactions.
   * When undefined, the database default isolation level is used (typically READ_COMMITTED).
   */
  get isolationLevel(): TransactionIsolationLevel | undefined {
    return this.transactionConfig.isolationLevel;
  }

  /**
   * Schedule a pre-commit callback. These will be run within the transaction right before it is
   * committed, and will be run in the order specified. Ordering of callbacks scheduled with the
   * same value for the order parameter is undefined within that ordering group.
   * @param callback - callback to schedule
   * @param order - order in which this should be run relative to other scheduled pre-commit callbacks,
   *                with higher numbers running later than lower numbers.
   */
  public appendPreCommitCallback(callback: PreCommitCallback, order: number): void {
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

  override isInTransaction(): this is EntityTransactionalQueryContext {
    return true;
  }

  isInNestedTransaction(): this is EntityNestedTransactionalQueryContext {
    return false;
  }

  async runInTransactionIfNotInTransactionAsync<T>(
    transactionScope: (queryContext: EntityTransactionalQueryContext) => Promise<T>,
    transactionConfig?: TransactionConfig,
  ): Promise<T> {
    assert(
      transactionConfig === undefined,
      'Should not pass transactionConfig to a nested transaction',
    );
    return await transactionScope(this);
  }

  async runInNestedTransactionAsync<T>(
    transactionScope: (innerQueryContext: EntityTransactionalQueryContext) => Promise<T>,
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
export class EntityNestedTransactionalQueryContext extends EntityTransactionalQueryContext {
  private readonly postCommitInvalidationCallbacksToTransfer: PostCommitCallback[] = [];
  private readonly postCommitCallbacksToTransfer: PostCommitCallback[] = [];

  constructor(
    queryInterface: any,
    /**
     * @internal
     */
    readonly parentQueryContext: EntityTransactionalQueryContext,
    entityQueryContextProvider: EntityQueryContextProvider,
    transactionId: string,
    transactionConfig: ResolvedTransactionConfig,
  ) {
    super(queryInterface, entityQueryContextProvider, transactionId, transactionConfig);
    parentQueryContext.childQueryContexts.push(this);
  }

  override isInNestedTransaction(): this is EntityNestedTransactionalQueryContext {
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

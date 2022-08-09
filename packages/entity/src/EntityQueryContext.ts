import assert from 'assert';

import EntityQueryContextProvider from './EntityQueryContextProvider';

export type PostCommitCallback = (...args: any) => Promise<any>;
export type PreCommitCallback = (
  queryContext: EntityTransactionalQueryContext,
  ...args: any
) => Promise<any>;

/**
 * Entity framework representation of transactional and non-transactional database
 * query execution units.
 *
 * The behavior of EntityMutator and EntityLoader
 * differs when in a transactional context.
 */
export abstract class EntityQueryContext {
  constructor(private readonly queryInterface: any) {}

  abstract isInTransaction(): boolean;

  getQueryInterface(): any {
    return this.queryInterface;
  }

  abstract runInTransactionIfNotInTransactionAsync<T>(
    transactionScope: (queryContext: EntityTransactionalQueryContext) => Promise<T>
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
    private readonly entityQueryContextProvider: EntityQueryContextProvider
  ) {
    super(queryInterface);
  }

  isInTransaction(): boolean {
    return false;
  }

  async runInTransactionIfNotInTransactionAsync<T>(
    transactionScope: (queryContext: EntityTransactionalQueryContext) => Promise<T>
  ): Promise<T> {
    return await this.entityQueryContextProvider.runInTransactionAsync(transactionScope);
  }
}

/**
 * Entity framework representation of a transactional query execution unit. When supplied
 * to EntityMutator and EntityLoader methods, those methods and their
 * dependent triggers and validators will run within the transaction.
 */
export class EntityTransactionalQueryContext extends EntityQueryContext {
  private readonly postCommitInvalidationCallbacks: PostCommitCallback[] = [];
  private readonly postCommitCallbacks: PostCommitCallback[] = [];

  private readonly preCommitCallbacks: { callback: PreCommitCallback; order: number }[] = [];

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
      `Invalid order specified: ${order}`
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

  public async runPreCommitCallbacksAsync(): Promise<void> {
    const callbacks = [...this.preCommitCallbacks]
      .sort((a, b) => a.order - b.order)
      .map((c) => c.callback);
    this.preCommitCallbacks.length = 0;

    for (const callback of callbacks) {
      await callback(this);
    }
  }

  public async runPostCommitCallbacksAsync(): Promise<void> {
    const invalidationCallbacks = [...this.postCommitInvalidationCallbacks];
    this.postCommitInvalidationCallbacks.length = 0;
    await Promise.all(invalidationCallbacks.map((callback) => callback()));

    const callbacks = [...this.postCommitCallbacks];
    this.postCommitCallbacks.length = 0;
    await Promise.all(callbacks.map((callback) => callback()));
  }

  isInTransaction(): boolean {
    return true;
  }

  async runInTransactionIfNotInTransactionAsync<T>(
    transactionScope: (queryContext: EntityTransactionalQueryContext) => Promise<T>
  ): Promise<T> {
    return await transactionScope(this);
  }
}

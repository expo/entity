import EntityQueryContextProvider from './EntityQueryContextProvider';

export type PostCommitCallback = (...args: any) => Promise<any>;

/**
 * Entity framework representation of transactional and non-transactional database
 * query execution units.
 *
 * The behavior of {@link EntityMutator} and {@link EntityLoader}
 * differs when in a transactional context.
 */
export abstract class EntityQueryContext {
  constructor(private readonly queryInterface: any) {}

  abstract isInTransaction(): boolean;

  getQueryInterface(): any {
    return this.queryInterface;
  }

  abstract async runInTransactionIfNotInTransactionAsync<T>(
    transactionScope: (queryContext: EntityTransactionalQueryContext) => Promise<T>
  ): Promise<T>;
}

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

export class EntityTransactionalQueryContext extends EntityQueryContext {
  private readonly postCommitCallbacks: PostCommitCallback[] = [];

  public appendPostCommitCallback(callback: PostCommitCallback): void {
    this.postCommitCallbacks.push(callback);
  }

  public async runPostCommitCallbacksAsync(): Promise<void> {
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

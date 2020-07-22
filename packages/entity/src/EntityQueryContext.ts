import IEntityQueryContextProvider from './IEntityQueryContextProvider';

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
    transactionScope: (queryContext: EntityQueryContext) => Promise<T>
  ): Promise<T>;
}

export class EntityNonTransactionalQueryContext extends EntityQueryContext {
  constructor(
    queryInterface: any,
    private readonly entityQueryContextProvider: IEntityQueryContextProvider
  ) {
    super(queryInterface);
  }

  isInTransaction(): boolean {
    return false;
  }

  async runInTransactionIfNotInTransactionAsync<T>(
    transactionScope: (queryContext: EntityQueryContext) => Promise<T>
  ): Promise<T> {
    if (this.isInTransaction()) {
      return await transactionScope(this);
    } else {
      return await this.entityQueryContextProvider.runInTransactionAsync(transactionScope);
    }
  }
}

export class EntityTransactionalQueryContext extends EntityQueryContext {
  isInTransaction(): boolean {
    return true;
  }

  async runInTransactionIfNotInTransactionAsync<T>(
    transactionScope: (queryContext: EntityQueryContext) => Promise<T>
  ): Promise<T> {
    return await transactionScope(this);
  }
}

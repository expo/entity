import {
  IEntityQueryContextProvider,
  EntityNonTransactionalQueryContext,
  EntityTransactionalQueryContext,
} from '@expo/entity';

export default class InMemoryQueryContextProvider implements IEntityQueryContextProvider {
  getQueryContext(): EntityNonTransactionalQueryContext {
    return new EntityNonTransactionalQueryContext({}, this);
  }

  async runInTransactionAsync<T>(
    transactionScope: (queryContext: EntityTransactionalQueryContext) => Promise<T>
  ): Promise<T> {
    return await transactionScope(new EntityTransactionalQueryContext({}));
  }
}

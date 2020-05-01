import {
  IEntityQueryContextProvider,
  EntityQueryContext,
  EntityNonTransactionalQueryContext,
  EntityTransactionalQueryContext,
} from '@expo/entity';

export default class InMemoryQueryContextProvider implements IEntityQueryContextProvider {
  getRegularEntityQueryContext(): EntityQueryContext {
    return new EntityNonTransactionalQueryContext({});
  }

  async runInTransactionAsync<T>(
    transactionScope: (queryContext: EntityQueryContext) => Promise<T>
  ): Promise<T> {
    return await transactionScope(new EntityTransactionalQueryContext({}));
  }
}

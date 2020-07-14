import {
  EntityNonTransactionalQueryContext,
  EntityTransactionalQueryContext,
} from '../../EntityQueryContext';
import IEntityQueryContextProvider from '../../IEntityQueryContextProvider';

class StubQueryContextProvider implements IEntityQueryContextProvider {
  getQueryContext(): EntityNonTransactionalQueryContext {
    return new EntityNonTransactionalQueryContext({}, this);
  }

  async runInTransactionAsync<T>(
    transactionScope: (queryContext: EntityTransactionalQueryContext) => Promise<T>
  ): Promise<T> {
    return await transactionScope(new EntityTransactionalQueryContext({}));
  }
}

export default new StubQueryContextProvider();

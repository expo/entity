import {
  EntityNonTransactionalQueryContext,
  EntityQueryContext,
  EntityTransactionalQueryContext,
} from '../EntityQueryContext';
import IEntityQueryContextProvider from '../IEntityQueryContextProvider';

class StubQueryContextProvider implements IEntityQueryContextProvider {
  getRegularEntityQueryContext(): EntityQueryContext {
    return new EntityNonTransactionalQueryContext({});
  }

  async runInTransactionAsync<T>(
    transactionScope: (queryContext: EntityQueryContext) => Promise<T>
  ): Promise<T> {
    return await transactionScope(new EntityTransactionalQueryContext({}));
  }
}

export default new StubQueryContextProvider();

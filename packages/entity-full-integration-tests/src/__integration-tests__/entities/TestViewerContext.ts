import { EntityQueryContext, EntityTransactionalQueryContext, ViewerContext } from '@expo/entity';

export default class TestViewerContext extends ViewerContext {
  public getQueryContext(): EntityQueryContext {
    return super.getQueryContextForDatabaseAdaptorFlavor('postgres');
  }

  public async runInTransactionAsync<TResult>(
    transactionScope: (queryContext: EntityTransactionalQueryContext) => Promise<TResult>
  ): Promise<TResult> {
    return await super.runInTransactionForDatabaseAdaptorFlavorAsync('postgres', transactionScope);
  }
}

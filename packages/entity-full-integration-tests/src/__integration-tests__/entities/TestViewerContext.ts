import { EntityQueryContext, EntityTransactionalQueryContext, ViewerContext } from '@expo/entity';

export default class TestViewerContext extends ViewerContext {
  public getQueryContext(): EntityQueryContext {
    return super.getNonTransactionalQueryContextForDatabaseAdaptorFlavor('postgres');
  }

  public async runInTransactionAsync<TResult>(
    transactionScope: (queryContext: EntityTransactionalQueryContext) => Promise<TResult>
  ): Promise<TResult> {
    return await super.runInTransactionForDatabaseAdaptorFlavorAsync('postgres', transactionScope);
  }
}

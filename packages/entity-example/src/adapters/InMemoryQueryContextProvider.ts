import { EntityQueryContextProvider, TransactionConfig } from '@expo/entity';

export default class InMemoryQueryContextProvider extends EntityQueryContextProvider {
  protected getQueryInterface(): any {
    return {};
  }

  protected createTransactionRunner<T>(
    _transactionConfig?: TransactionConfig
  ): (transactionScope: (queryInterface: any) => Promise<T>) => Promise<T> {
    return (transactionScope) => Promise.resolve(transactionScope({}));
  }

  protected createNestedTransactionRunner<T>(
    _outerQueryInterface: any
  ): (transactionScope: (queryInterface: any) => Promise<T>) => Promise<T> {
    return (transactionScope) => Promise.resolve(transactionScope({}));
  }
}

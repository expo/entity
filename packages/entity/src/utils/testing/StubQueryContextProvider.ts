import { TransactionConfig } from '../../EntityQueryContext';
import EntityQueryContextProvider from '../../EntityQueryContextProvider';

export class StubQueryContextProvider extends EntityQueryContextProvider {
  protected getQueryInterface(): any {
    return {};
  }

  protected createTransactionRunner<T>(
    _transactionConfig?: TransactionConfig
  ): (transactionScope: (queryInterface: any) => Promise<T>) => Promise<T> {
    return (transactionScope) => Promise.resolve(transactionScope({}));
  }

  protected createNestedTransactionRunner<T>(
    _outerQueryInterface: any,
    _transactionConfig?: TransactionConfig
  ): (transactionScope: (queryInterface: any) => Promise<T>) => Promise<T> {
    return (transactionScope) => Promise.resolve(transactionScope({}));
  }
}

export default new StubQueryContextProvider();

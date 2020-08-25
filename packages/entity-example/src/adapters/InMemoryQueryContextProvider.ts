import { EntityQueryContextProvider } from '@expo/entity';

export default class InMemoryQueryContextProvider extends EntityQueryContextProvider {
  protected getQueryInterface(): any {
    return {};
  }

  protected createTransactionRunner<T>(): (
    transactionScope: (queryInterface: any) => Promise<T>
  ) => Promise<T> {
    return (transactionScope) => Promise.resolve(transactionScope({}));
  }
}

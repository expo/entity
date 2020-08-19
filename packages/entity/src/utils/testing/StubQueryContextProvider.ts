import EntityQueryContextProvider from '../../EntityQueryContextProvider';

class StubQueryContextProvider extends EntityQueryContextProvider {
  protected getQueryInterface(): any {
    return {};
  }

  protected createTransactionRunner<T>(): (
    transactionScope: (queryInterface: any) => Promise<T>
  ) => Promise<T> {
    return (transactionScope) => Promise.resolve(transactionScope({}));
  }
}

export default new StubQueryContextProvider();

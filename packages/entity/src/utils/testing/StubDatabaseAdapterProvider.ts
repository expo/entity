import EntityConfiguration from '../../EntityConfiguration';
import EntityDatabaseAdapter from '../../EntityDatabaseAdapter';
import IEntityDatabaseAdapterProvider from '../../IEntityDatabaseAdapterProvider';
import StubDatabaseAdapter from './StubDatabaseAdapter';

export default class StubDatabaseAdapterProvider implements IEntityDatabaseAdapterProvider {
  private readonly objectCollection = new Map();

  getDatabaseAdapter<TDatabaseFields>(
    entityConfiguration: EntityConfiguration<TDatabaseFields>
  ): EntityDatabaseAdapter<TDatabaseFields> {
    return new StubDatabaseAdapter(entityConfiguration, this.objectCollection);
  }
}

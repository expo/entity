import StubDatabaseAdapter from './StubDatabaseAdapter';
import EntityConfiguration from '../../EntityConfiguration';
import EntityDatabaseAdapter from '../../EntityDatabaseAdapter';
import IEntityDatabaseAdapterProvider from '../../IEntityDatabaseAdapterProvider';

export default class StubDatabaseAdapterProvider implements IEntityDatabaseAdapterProvider {
  private readonly objectCollection = new Map();

  getDatabaseAdapter<TFields extends Record<string, any>>(
    entityConfiguration: EntityConfiguration<TFields>
  ): EntityDatabaseAdapter<TFields> {
    return new StubDatabaseAdapter(entityConfiguration, this.objectCollection);
  }
}

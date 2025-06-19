import { EntityConfiguration } from '../../EntityConfiguration';
import { EntityDatabaseAdapter } from '../../EntityDatabaseAdapter';
import { IEntityDatabaseAdapterProvider } from '../../IEntityDatabaseAdapterProvider';
import { StubDatabaseAdapter } from '../__testfixtures__/StubDatabaseAdapter';

export class StubDatabaseAdapterProvider implements IEntityDatabaseAdapterProvider {
  private readonly objectCollection = new Map();

  getDatabaseAdapter<TFields extends Record<string, any>, TIDField extends keyof TFields>(
    entityConfiguration: EntityConfiguration<TFields, TIDField>,
  ): EntityDatabaseAdapter<TFields, TIDField> {
    return new StubDatabaseAdapter(entityConfiguration, this.objectCollection);
  }
}

import type { EntityConfiguration } from '../../EntityConfiguration.ts';
import type { EntityDatabaseAdapter } from '../../EntityDatabaseAdapter.ts';
import type { IEntityDatabaseAdapterProvider } from '../../IEntityDatabaseAdapterProvider.ts';
import { StubDatabaseAdapter } from '../__testfixtures__/StubDatabaseAdapter.ts';

export class StubDatabaseAdapterProvider implements IEntityDatabaseAdapterProvider {
  private readonly objectCollection = new Map();

  getDatabaseAdapter<TFields extends Record<string, any>, TIDField extends keyof TFields>(
    entityConfiguration: EntityConfiguration<TFields, TIDField>,
  ): EntityDatabaseAdapter<TFields, TIDField> {
    return new StubDatabaseAdapter(entityConfiguration, this.objectCollection);
  }
}

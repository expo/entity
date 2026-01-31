import { EntityConfiguration } from '../../EntityConfiguration';
import { EntityDatabaseAdapter } from '../../EntityDatabaseAdapter';
import { EntityKnexDatabaseAdapter } from '../../EntityKnexDatabaseAdapter';
import { IEntityDatabaseAdapterProvider } from '../../IEntityDatabaseAdapterProvider';
import { StubDatabaseAdapter } from '../__testfixtures__/StubDatabaseAdapter';
import { StubKnexDatabaseAdapter } from '../__testfixtures__/StubKnexDatabaseAdapter';

export class StubDatabaseAdapterProvider implements IEntityDatabaseAdapterProvider {
  private readonly objectCollection = new Map();

  getDatabaseAdapter<TFields extends Record<string, any>, TIDField extends keyof TFields>(
    entityConfiguration: EntityConfiguration<TFields, TIDField>,
  ): EntityDatabaseAdapter<TFields, TIDField> {
    return new StubDatabaseAdapter(entityConfiguration, this.objectCollection);
  }

  getKnexDatabaseAdapter<TFields extends Record<string, any>, TIDField extends keyof TFields>(
    entityConfiguration: EntityConfiguration<TFields, TIDField>,
  ): EntityKnexDatabaseAdapter<TFields, TIDField> {
    return new StubKnexDatabaseAdapter(entityConfiguration, new Map(), this.objectCollection);
  }
}

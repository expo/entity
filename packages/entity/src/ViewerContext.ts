import { IEntityClass } from './Entity';
import EntityCompanionProvider, { DatabaseAdapterFlavor } from './EntityCompanionProvider';
import EntityPrivacyPolicy from './EntityPrivacyPolicy';
import {
  EntityQueryContext,
  EntityTransactionalQueryContext,
  TransactionConfig,
} from './EntityQueryContext';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerScopedEntityCompanion from './ViewerScopedEntityCompanion';
import ViewerScopedEntityCompanionProvider from './ViewerScopedEntityCompanionProvider';

/**
 * A viewer context encapsulates all information necessary to evaluate an EntityPrivacyPolicy.
 *
 * In combination with an EntityCompanionProvider, a viewer context is the
 * entry point into the Entity framework.
 */
export default class ViewerContext {
  private readonly viewerScopedEntityCompanionProvider: ViewerScopedEntityCompanionProvider;

  constructor(public readonly entityCompanionProvider: EntityCompanionProvider) {
    this.viewerScopedEntityCompanionProvider = new ViewerScopedEntityCompanionProvider(
      entityCompanionProvider,
      this,
    );
  }

  get [Symbol.toStringTag](): string {
    return this.constructor.name;
  }

  getViewerScopedEntityCompanionForClass<
    TMFields extends object,
    TMIDField extends keyof NonNullable<Pick<TMFields, TMSelectedFields>>,
    TMViewerContext extends ViewerContext,
    TMEntity extends ReadonlyEntity<TMFields, TMIDField, TMViewerContext, TMSelectedFields>,
    TMPrivacyPolicy extends EntityPrivacyPolicy<
      TMFields,
      TMIDField,
      TMViewerContext,
      TMEntity,
      TMSelectedFields
    >,
    TMSelectedFields extends keyof TMFields,
  >(
    entityClass: IEntityClass<
      TMFields,
      TMIDField,
      TMViewerContext,
      TMEntity,
      TMPrivacyPolicy,
      TMSelectedFields
    >,
  ): ViewerScopedEntityCompanion<
    TMFields,
    TMIDField,
    TMViewerContext,
    TMEntity,
    TMPrivacyPolicy,
    TMSelectedFields
  > {
    return this.viewerScopedEntityCompanionProvider.getViewerScopedCompanionForEntity(entityClass);
  }

  /**
   * Get the regular (non-transactional) query context for a database adaptor flavor.
   * @param databaseAdaptorFlavor - database adaptor flavor
   */
  getQueryContextForDatabaseAdaptorFlavor(
    databaseAdaptorFlavor: DatabaseAdapterFlavor,
  ): EntityQueryContext {
    return this.entityCompanionProvider
      .getQueryContextProviderForDatabaseAdaptorFlavor(databaseAdaptorFlavor)
      .getQueryContext();
  }

  /**
   * Run a transaction of specified database adaptor flavor and execute the provided
   * transaction-scoped closure within the transaction.
   * @param databaseAdaptorFlavor - databaseAdaptorFlavor
   * @param transactionScope - async callback to execute within the transaction
   */
  async runInTransactionForDatabaseAdaptorFlavorAsync<TResult>(
    databaseAdaptorFlavor: DatabaseAdapterFlavor,
    transactionScope: (queryContext: EntityTransactionalQueryContext) => Promise<TResult>,
    transactionConfig?: TransactionConfig,
  ): Promise<TResult> {
    return await this.entityCompanionProvider
      .getQueryContextProviderForDatabaseAdaptorFlavor(databaseAdaptorFlavor)
      .getQueryContext()
      .runInTransactionIfNotInTransactionAsync(transactionScope, transactionConfig);
  }
}

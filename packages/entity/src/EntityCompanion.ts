import EntityCompanionProvider, { EntityCompanionDefinition } from './EntityCompanionProvider';
import EntityLoaderFactory from './EntityLoaderFactory';
import EntityMutatorFactory from './EntityMutatorFactory';
import EntityPrivacyPolicy from './EntityPrivacyPolicy';
import EntityQueryContextProvider from './EntityQueryContextProvider';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerContext from './ViewerContext';
import EntityTableDataCoordinator from './internal/EntityTableDataCoordinator';
import IEntityMetricsAdapter from './metrics/IEntityMetricsAdapter';
import { mergeEntityMutationTriggerConfigurations } from './utils/mergeEntityMutationTriggerConfigurations';

export interface IPrivacyPolicyClass<TPrivacyPolicy> {
  new (): TPrivacyPolicy;
}

/**
 * Composition root responsible for orchestrating setup of Entity mutators and loaders.
 */
export default class EntityCompanion<
  TFields extends Record<string, any>,
  TIDField extends keyof NonNullable<Pick<TFields, TSelectedFields>>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TIDField, TViewerContext, TSelectedFields>,
  TPrivacyPolicy extends EntityPrivacyPolicy<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TSelectedFields
  >,
  TSelectedFields extends keyof TFields,
> {
  public readonly privacyPolicy: TPrivacyPolicy;

  private readonly entityLoaderFactory: EntityLoaderFactory<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  >;
  private readonly entityMutatorFactory: EntityMutatorFactory<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  >;

  constructor(
    public readonly entityCompanionProvider: EntityCompanionProvider,
    public readonly entityCompanionDefinition: EntityCompanionDefinition<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    private readonly tableDataCoordinator: EntityTableDataCoordinator<TFields, TIDField>,
    private readonly metricsAdapter: IEntityMetricsAdapter,
  ) {
    this.privacyPolicy = new entityCompanionDefinition.privacyPolicyClass();
    this.entityLoaderFactory = new EntityLoaderFactory<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >(this, tableDataCoordinator.dataManager, metricsAdapter);
    this.entityMutatorFactory = new EntityMutatorFactory(
      entityCompanionProvider,
      tableDataCoordinator.entityConfiguration,
      entityCompanionDefinition.entityClass,
      this.privacyPolicy,
      entityCompanionDefinition.mutationValidators ?? [],
      mergeEntityMutationTriggerConfigurations(
        entityCompanionDefinition.mutationTriggers ?? {},
        entityCompanionProvider.globalMutationTriggers ?? {},
      ),
      this.entityLoaderFactory,
      tableDataCoordinator.databaseAdapter,
      metricsAdapter,
    );
  }

  getLoaderFactory(): EntityLoaderFactory<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    return this.entityLoaderFactory;
  }

  getMutatorFactory(): EntityMutatorFactory<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    return this.entityMutatorFactory;
  }

  /**
   * Get the query context provider for this entity.
   */
  getQueryContextProvider(): EntityQueryContextProvider {
    return this.tableDataCoordinator.getQueryContextProvider();
  }

  /**
   * Get the IEntityMetricsAdapter for this companion.
   */
  getMetricsAdapter(): IEntityMetricsAdapter {
    return this.metricsAdapter;
  }
}

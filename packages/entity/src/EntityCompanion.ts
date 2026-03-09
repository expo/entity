import type {
  EntityCompanionDefinition,
  EntityCompanionProvider,
} from './EntityCompanionProvider.ts';
import { EntityLoaderFactory } from './EntityLoaderFactory.ts';
import { EntityMutatorFactory } from './EntityMutatorFactory.ts';
import type { EntityPrivacyPolicy } from './EntityPrivacyPolicy.ts';
import type { EntityQueryContextProvider } from './EntityQueryContextProvider.ts';
import type { ReadonlyEntity } from './ReadonlyEntity.ts';
import type { ViewerContext } from './ViewerContext.ts';
import type { EntityTableDataCoordinator } from './internal/EntityTableDataCoordinator.ts';
import type { IEntityMetricsAdapter } from './metrics/IEntityMetricsAdapter.ts';
import { mergeEntityMutationTriggerConfigurations } from './utils/mergeEntityMutationTriggerConfigurations.ts';

export interface IPrivacyPolicyClass<TPrivacyPolicy> {
  new (): TPrivacyPolicy;
}

/**
 * Composition root responsible for orchestrating setup of Entity mutators and loaders.
 */
export class EntityCompanion<
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
    public readonly tableDataCoordinator: EntityTableDataCoordinator<TFields, TIDField>,
    public readonly metricsAdapter: IEntityMetricsAdapter,
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
      entityCompanionDefinition.mutationValidators ?? {},
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

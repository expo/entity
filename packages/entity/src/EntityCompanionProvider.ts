import { IEntityClass } from './Entity';
import EntityCompanion, { IPrivacyPolicyClass } from './EntityCompanion';
import EntityConfiguration from './EntityConfiguration';
import EntityMutationTriggerConfiguration from './EntityMutationTriggerConfiguration';
import EntityMutationValidator from './EntityMutationValidator';
import EntityPrivacyPolicy from './EntityPrivacyPolicy';
import EntityQueryContextProvider from './EntityQueryContextProvider';
import IEntityCacheAdapterProvider from './IEntityCacheAdapterProvider';
import IEntityDatabaseAdapterProvider from './IEntityDatabaseAdapterProvider';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerContext from './ViewerContext';
import EntityTableDataCoordinator from './internal/EntityTableDataCoordinator';
import IEntityMetricsAdapter from './metrics/IEntityMetricsAdapter';
import { computeIfAbsent } from './utils/collections/maps';

/**
 * Backing database and transaction type for an entity. The definitions and implementations
 * are provided by injection in the root EntityCompanionProvider to allow for mocking and sharing.
 *
 * Note: this enum will likely be modified soon to be more flexible.
 */
export enum DatabaseAdapterFlavor {
  /**
   * Knex postgres adapter, using postgres table and postgres transactions.
   */
  POSTGRES = 'postgres',
}

/**
 * Cache system for an entity. The definitions and implementations are provided by injection
 * in the root EntityCompanionProvider to allow for mocking and sharing.
 *
 * Note: this enum will likely be modified soon to be more flexible.
 */
export enum CacheAdapterFlavor {
  REDIS = 'redis',
}

/**
 * Defines a set interfaces for a entity database adapter flavor. An entity that uses a flavor
 * will use the specified adapter for database accesses and the specified query context provider
 * for providing query contexts.
 */
export interface DatabaseAdapterFlavorDefinition {
  adapterProvider: IEntityDatabaseAdapterProvider;
  queryContextProvider: EntityQueryContextProvider;
}

/**
 * Defines an interface for a cache adapter flavor. An entity that uses a flavor will use the
 * specified adapter for caching.
 */
export interface CacheAdapterFlavorDefinition {
  cacheAdapterProvider: IEntityCacheAdapterProvider;
}

/**
 * Definition for constructing a companion for an entity. Defines the core set of objects
 * used to power the entity framework for a particular type of entity.
 */
export class EntityCompanionDefinition<
  TFields,
  TID,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TSelectedFields>,
  TPrivacyPolicy extends EntityPrivacyPolicy<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TSelectedFields
  >,
  TSelectedFields extends keyof TFields = keyof TFields
> {
  readonly entityClass: IEntityClass<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  >;
  readonly entityConfiguration: EntityConfiguration<TFields>;
  readonly privacyPolicyClass: IPrivacyPolicyClass<TPrivacyPolicy>;
  readonly mutationValidators: EntityMutationValidator<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TSelectedFields
  >[];
  readonly mutationTriggers: EntityMutationTriggerConfiguration<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TSelectedFields
  >;
  readonly entitySelectedFields: TSelectedFields[];

  constructor({
    entityClass,
    entityConfiguration,
    privacyPolicyClass,
    mutationValidators = [],
    mutationTriggers = {},
    entitySelectedFields = Array.from(entityConfiguration.schema.keys()) as TSelectedFields[],
  }: {
    entityClass: IEntityClass<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >;
    entityConfiguration: EntityConfiguration<TFields>;
    privacyPolicyClass: IPrivacyPolicyClass<TPrivacyPolicy>;
    mutationValidators?: EntityMutationValidator<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TSelectedFields
    >[];
    mutationTriggers?: EntityMutationTriggerConfiguration<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TSelectedFields
    >;
    entitySelectedFields?: TSelectedFields[];
  }) {
    this.entityClass = entityClass;
    this.entityConfiguration = entityConfiguration;
    this.privacyPolicyClass = privacyPolicyClass;
    this.mutationValidators = mutationValidators;
    this.mutationTriggers = mutationTriggers;
    this.entitySelectedFields = entitySelectedFields;
  }
}

/**
 * An instance of the Entity framework.
 *
 * Required to create a {@link ViewerContext}, which is the application entry point
 * into the framework.
 *
 * Internally, this is a lazy entity companion factory that instantiates and caches one
 * {@link EntityCompanion} for each type of {@link Entity}.
 */
export default class EntityCompanionProvider {
  private readonly companionMap: Map<
    string,
    EntityCompanion<any, any, any, any, any, any>
  > = new Map();
  private readonly tableDataCoordinatorMap: Map<
    string,
    EntityTableDataCoordinator<any>
  > = new Map();

  /**
   * Instantiate an Entity framework.
   * @param metricsAdapter - An {@link IEntityMetricsAdapter} for collecting metrics on this instance
   * @param databaseAdapterFlavors - Database adapter configurations for this instance
   * @param cacheAdapterFlavors - Cache adapter configurations for this instance
   */
  constructor(
    private metricsAdapter: IEntityMetricsAdapter,
    private databaseAdapterFlavors: Record<DatabaseAdapterFlavor, DatabaseAdapterFlavorDefinition>,
    private cacheAdapterFlavors: Record<CacheAdapterFlavor, CacheAdapterFlavorDefinition>
  ) {}

  /**
   * Get the entity companion for specified entity. If not already computed and cached, the entity
   * companion is constructed using the configuration provided by the factory.
   *
   * @param entityClass - entity class to load
   * @param factory - entity companion factory
   */
  getCompanionForEntity<
    TFields,
    TID,
    TViewerContext extends ViewerContext,
    TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TSelectedFields>,
    TPrivacyPolicy extends EntityPrivacyPolicy<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
    TSelectedFields extends keyof TFields
  >(
    entityClass: IEntityClass<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    entityCompanionDefinition: EntityCompanionDefinition<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >
  ): EntityCompanion<TFields, TID, TViewerContext, TEntity, TPrivacyPolicy, TSelectedFields> {
    const tableDataCoordinator = this.getTableDataCoordinatorForEntity(
      entityCompanionDefinition.entityConfiguration
    );
    return computeIfAbsent(this.companionMap, entityClass.name, () => {
      return new EntityCompanion(
        entityCompanionDefinition.entityClass,
        tableDataCoordinator,
        entityCompanionDefinition.privacyPolicyClass,
        entityCompanionDefinition.mutationValidators,
        entityCompanionDefinition.mutationTriggers,
        this.metricsAdapter
      );
    });
  }

  private getTableDataCoordinatorForEntity<TFields>(
    entityConfiguration: EntityConfiguration<TFields>
  ): EntityTableDataCoordinator<TFields> {
    return computeIfAbsent(this.tableDataCoordinatorMap, entityConfiguration.tableName, () => {
      const entityDatabaseAdapterFlavor = this.databaseAdapterFlavors[
        entityConfiguration.databaseAdapterFlavor
      ];
      const entityCacheAdapterFlavor = this.cacheAdapterFlavors[
        entityConfiguration.cacheAdapterFlavor
      ];
      return new EntityTableDataCoordinator(
        entityConfiguration,
        entityDatabaseAdapterFlavor.adapterProvider,
        entityCacheAdapterFlavor.cacheAdapterProvider,
        entityDatabaseAdapterFlavor.queryContextProvider,
        this.metricsAdapter
      );
    });
  }
}

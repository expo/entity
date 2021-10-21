import invariant from 'invariant';

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
 */
export type DatabaseAdapterFlavor = string;

/**
 * Cache system for an entity. The definitions and implementations are provided by injection
 * in the root EntityCompanionProvider to allow for mocking and sharing.
 */
export type CacheAdapterFlavor = string;

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
  TID extends NonNullable<TFields[TSelectedFields]>,
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
  readonly mutationValidators: () => EntityMutationValidator<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TSelectedFields
  >[];
  readonly mutationTriggers: () => EntityMutationTriggerConfiguration<
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
    mutationValidators = () => [],
    mutationTriggers = () => ({}),
    entitySelectedFields = Array.from(entityConfiguration.schema.keys()) as TSelectedFields[],
  }: {
    /**
     * The concrete Entity class for which this is the definition.
     */
    entityClass: IEntityClass<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >;
    /**
     * The {@link EntityConfiguration} for this entity.
     */
    entityConfiguration: EntityConfiguration<TFields>;
    /**
     * The {@link EntityPrivacyPolicy} class for this entity.
     */
    privacyPolicyClass: IPrivacyPolicyClass<TPrivacyPolicy>;
    /**
     * An optional list of {@link EntityMutationValidator} for this entity.
     */
    mutationValidators?: () => EntityMutationValidator<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TSelectedFields
    >[];
    /**
     * An optional list of {@link EntityMutationTrigger} for this entity.
     */
    mutationTriggers?: () => EntityMutationTriggerConfiguration<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TSelectedFields
    >;
    /**
     * An optional subset of fields defined in the {@link EntityConfiguration} which belong to this entity.
     * For use when multiple types of entities are backed by a single table ({@link EntityConfiguration}) yet
     * only expose a subset of the fields.
     */
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
  private readonly companionMap: Map<string, EntityCompanion<any, any, any, any, any, any>> =
    new Map();
  private readonly tableDataCoordinatorMap: Map<string, EntityTableDataCoordinator<any>> =
    new Map();

  /**
   * Instantiate an Entity framework.
   * @param metricsAdapter - An {@link IEntityMetricsAdapter} for collecting metrics on this instance
   * @param databaseAdapterFlavors - Database adapter configurations for this instance
   * @param cacheAdapterFlavors - Cache adapter configurations for this instance
   */
  constructor(
    public readonly metricsAdapter: IEntityMetricsAdapter,
    private databaseAdapterFlavors: ReadonlyMap<
      DatabaseAdapterFlavor,
      DatabaseAdapterFlavorDefinition
    >,
    private cacheAdapterFlavors: ReadonlyMap<CacheAdapterFlavor, CacheAdapterFlavorDefinition>
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
    TID extends NonNullable<TFields[TSelectedFields]>,
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
      entityCompanionDefinition.entityConfiguration,
      entityClass.name
    );
    return computeIfAbsent(this.companionMap, entityClass.name, () => {
      return new EntityCompanion(
        entityCompanionDefinition.entityClass,
        tableDataCoordinator,
        entityCompanionDefinition.privacyPolicyClass,
        entityCompanionDefinition.mutationValidators(),
        entityCompanionDefinition.mutationTriggers(),
        this.metricsAdapter
      );
    });
  }

  getQueryContextProviderForDatabaseAdaptorFlavor(
    databaseAdapterFlavor: DatabaseAdapterFlavor
  ): EntityQueryContextProvider {
    const entityDatabaseAdapterFlavor = this.databaseAdapterFlavors.get(databaseAdapterFlavor);
    invariant(
      entityDatabaseAdapterFlavor,
      `No database adaptor configuration found for flavor: ${databaseAdapterFlavor}`
    );

    return entityDatabaseAdapterFlavor.queryContextProvider;
  }

  private getTableDataCoordinatorForEntity<TFields>(
    entityConfiguration: EntityConfiguration<TFields>,
    entityClassName: string
  ): EntityTableDataCoordinator<TFields> {
    return computeIfAbsent(this.tableDataCoordinatorMap, entityConfiguration.tableName, () => {
      const entityDatabaseAdapterFlavor = this.databaseAdapterFlavors.get(
        entityConfiguration.databaseAdapterFlavor
      );
      invariant(
        entityDatabaseAdapterFlavor,
        `No database adaptor configuration found for flavor: ${entityConfiguration.databaseAdapterFlavor}`
      );

      const entityCacheAdapterFlavor = this.cacheAdapterFlavors.get(
        entityConfiguration.cacheAdapterFlavor
      );
      invariant(
        entityCacheAdapterFlavor,
        `No cache adaptor configuration found for flavor: ${entityConfiguration.cacheAdapterFlavor}`
      );

      return new EntityTableDataCoordinator(
        entityConfiguration,
        entityDatabaseAdapterFlavor.adapterProvider,
        entityCacheAdapterFlavor.cacheAdapterProvider,
        entityDatabaseAdapterFlavor.queryContextProvider,
        this.metricsAdapter,
        entityClassName
      );
    });
  }
}

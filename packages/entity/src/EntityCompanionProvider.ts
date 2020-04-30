import { IEntityClass } from './Entity';
import EntityCompanion, { IDatabaseAdapterClass, IPrivacyPolicyClass } from './EntityCompanion';
import EntityConfiguration from './EntityConfiguration';
import EntityPrivacyPolicy from './EntityPrivacyPolicy';
import IEntityCacheAdapterProvider from './IEntityCacheAdapterProvider';
import IEntityQueryContextProvider from './IEntityQueryContextProvider';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerContext from './ViewerContext';
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
export interface DatabaseAdapterFlavorDefinition<TFields> {
  adapter: IDatabaseAdapterClass<TFields>;
  queryContextProvider: IEntityQueryContextProvider;
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
export interface EntityCompanionDefinition<
  TFields,
  TID,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext>,
  TPrivacyPolicy extends EntityPrivacyPolicy<TFields, TID, TViewerContext, TEntity>
> {
  entityClass: IEntityClass<TFields, TID, TViewerContext, TEntity, TPrivacyPolicy>;
  entityConfiguration: EntityConfiguration<TFields>;
  databaseAdaptorFlavor: DatabaseAdapterFlavor;
  cacheAdaptorFlavor: CacheAdapterFlavor;
  privacyPolicyClass: IPrivacyPolicyClass<TPrivacyPolicy>;
}

/**
 * Lazy entity companion factory that caches one companion for each entity type.
 */
export default class EntityCompanionProvider {
  private readonly entityCompanionMap: Map<
    string,
    EntityCompanion<any, any, any, any, any>
  > = new Map();

  constructor(
    private metricsAdapter: IEntityMetricsAdapter,
    private databaseAdapterFlavors: Record<
      DatabaseAdapterFlavor,
      DatabaseAdapterFlavorDefinition<any>
    >,
    private cacheAdapterFlavors: Record<CacheAdapterFlavor, CacheAdapterFlavorDefinition>
  ) {}

  /**
   * Get the entity companion for specified entity. If not already computed and cached, the entity
   * companion is constructed using the configuration provided by the factory.
   *
   * @param entityClass entity class to load
   * @param factory entity companion factory
   */
  getCompanionForEntity<
    TFields,
    TID,
    TViewerContext extends ViewerContext,
    TEntity extends ReadonlyEntity<TFields, TID, TViewerContext>,
    TPrivacyPolicy extends EntityPrivacyPolicy<TFields, TID, TViewerContext, TEntity>
  >(
    entityClass: IEntityClass<TFields, TID, TViewerContext, TEntity, TPrivacyPolicy>,
    entityCompanionDefinition: EntityCompanionDefinition<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TPrivacyPolicy
    >
  ): EntityCompanion<TFields, TID, TViewerContext, TEntity, TPrivacyPolicy> {
    return computeIfAbsent(this.entityCompanionMap, entityClass.name, () => {
      const entityDatabaseAdapterFlavor = this.databaseAdapterFlavors[
        entityCompanionDefinition.databaseAdaptorFlavor
      ];
      const entityCacheAdapterFlavor = this.cacheAdapterFlavors[
        entityCompanionDefinition.cacheAdaptorFlavor
      ];
      return new EntityCompanion(
        entityCompanionDefinition.entityClass,
        entityCompanionDefinition.entityConfiguration,
        entityDatabaseAdapterFlavor.adapter,
        entityCacheAdapterFlavor.cacheAdapterProvider,
        entityCompanionDefinition.privacyPolicyClass,
        entityDatabaseAdapterFlavor.queryContextProvider,
        this.metricsAdapter
      );
    });
  }
}

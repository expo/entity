import invariant from 'invariant';

import { IEntityClass } from './Entity';
import { EntityCompanion, IPrivacyPolicyClass } from './EntityCompanion';
import { EntityConfiguration } from './EntityConfiguration';
import { EntityMutationTriggerConfiguration } from './EntityMutationTriggerConfiguration';
import { EntityMutationValidatorConfiguration } from './EntityMutationValidatorConfiguration';
import { EntityPrivacyPolicy } from './EntityPrivacyPolicy';
import { EntityQueryContextProvider } from './EntityQueryContextProvider';
import { IEntityCacheAdapterProvider } from './IEntityCacheAdapterProvider';
import { IEntityDatabaseAdapterProvider } from './IEntityDatabaseAdapterProvider';
import { ReadonlyEntity } from './ReadonlyEntity';
import { ViewerContext } from './ViewerContext';
import { ViewerScopedEntityCompanion } from './ViewerScopedEntityCompanion';
import { EntityTableDataCoordinator } from './internal/EntityTableDataCoordinator';
import { IEntityMetricsAdapter } from './metrics/IEntityMetricsAdapter';
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
export interface EntityCompanionDefinition<
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
  TSelectedFields extends keyof TFields = keyof TFields,
> {
  /**
   * The concrete Entity class for which this is the definition.
   */
  readonly entityClass: IEntityClass<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  >;

  /**
   * The EntityConfiguration for this entity.
   */
  readonly entityConfiguration: EntityConfiguration<TFields, TIDField>;

  /**
   * The EntityPrivacyPolicy class for this entity.
   */
  readonly privacyPolicyClass: IPrivacyPolicyClass<TPrivacyPolicy>;

  /**
   * An optional EntityMutationValidatorConfiguration for this entity.
   */
  readonly mutationValidators?: EntityMutationValidatorConfiguration<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TSelectedFields
  >;

  /**
   * An optional EntityMutationTriggerConfiguration for this entity.
   */
  readonly mutationTriggers?: EntityMutationTriggerConfiguration<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TSelectedFields
  >;

  /**
   * An optional subset of fields defined in the EntityConfiguration which belong to this entity.
   * For use when multiple types of entities are backed by a single table (EntityConfiguration) yet
   * only expose a subset of the fields.
   */
  readonly entitySelectedFields?: TSelectedFields[];
}

/**
 * An instance of the Entity framework.
 *
 * Required to create a ViewerContext, which is the application entry point
 * into the framework.
 *
 * Internally, this is a lazy entity companion factory that instantiates and caches one
 * EntityCompanion for each type of Entity.
 */
export class EntityCompanionProvider {
  private readonly companionDefinitionMap: Map<
    string,
    EntityCompanionDefinition<any, any, any, any, any, any>
  > = new Map();
  private readonly companionMap: Map<string, EntityCompanion<any, any, any, any, any, any>> =
    new Map();
  private readonly tableDataCoordinatorMap: Map<string, EntityTableDataCoordinator<any, any>> =
    new Map();
  private static readonly installedExtensions = new Set<string>();

  /**
   * Instantiate an Entity framework.
   * @param metricsAdapter - An IEntityMetricsAdapter for collecting metrics on this instance
   * @param databaseAdapterFlavors - Database adapter configurations for this instance
   * @param cacheAdapterFlavors - Cache adapter configurations for this instance
   * @param globalMutationTriggers - Optional set of EntityMutationTrigger to run for all entity mutations systemwide.
   */
  constructor(
    public readonly metricsAdapter: IEntityMetricsAdapter,
    private readonly databaseAdapterFlavors: ReadonlyMap<
      DatabaseAdapterFlavor,
      DatabaseAdapterFlavorDefinition
    >,
    private readonly cacheAdapterFlavors: ReadonlyMap<
      CacheAdapterFlavor,
      CacheAdapterFlavorDefinition
    >,
    readonly globalMutationTriggers: EntityMutationTriggerConfiguration<
      any,
      any,
      any,
      any,
      any
    > = {},
  ) {
    // Install any extensions required by the database adapter flavors
    for (const flavorDefinition of databaseAdapterFlavors.values()) {
      if (
        !EntityCompanionProvider.installedExtensions.has(
          flavorDefinition.adapterProvider.getExtensionsKey(),
        )
      ) {
        flavorDefinition.adapterProvider.installExtensions({
          EntityCompanionClass: EntityCompanion,
          EntityTableDataCoordinatorClass: EntityTableDataCoordinator,
          ViewerScopedEntityCompanionClass: ViewerScopedEntityCompanion,
          ReadonlyEntityClass: ReadonlyEntity,
        });
        EntityCompanionProvider.installedExtensions.add(
          flavorDefinition.adapterProvider.getExtensionsKey(),
        );
      }
    }
  }

  /**
   * Get the entity companion for specified entity. If not already computed and cached, the entity
   * companion is constructed using the configuration provided by the factory.
   *
   * @param entityClass - entity class to load
   */
  getCompanionForEntity<
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
  >(
    entityClass: IEntityClass<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
  ): EntityCompanion<TFields, TIDField, TViewerContext, TEntity, TPrivacyPolicy, TSelectedFields> {
    const entityCompanionDefinition = computeIfAbsent(
      this.companionDefinitionMap,
      entityClass.name,
      () => entityClass.defineCompanionDefinition(),
    );
    const tableDataCoordinator = this.getTableDataCoordinatorForEntity(
      entityCompanionDefinition.entityConfiguration,
      entityClass.name,
    );
    return computeIfAbsent(this.companionMap, entityClass.name, () => {
      return new EntityCompanion(
        this,
        entityCompanionDefinition,
        tableDataCoordinator,
        this.metricsAdapter,
      );
    });
  }

  getQueryContextProviderForDatabaseAdaptorFlavor(
    databaseAdapterFlavor: DatabaseAdapterFlavor,
  ): EntityQueryContextProvider {
    const entityDatabaseAdapterFlavor = this.databaseAdapterFlavors.get(databaseAdapterFlavor);
    invariant(
      entityDatabaseAdapterFlavor,
      `No database adaptor configuration found for flavor: ${databaseAdapterFlavor}`,
    );

    return entityDatabaseAdapterFlavor.queryContextProvider;
  }

  private getTableDataCoordinatorForEntity<
    TFields extends Record<string, any>,
    TIDField extends keyof TFields,
  >(
    entityConfiguration: EntityConfiguration<TFields, TIDField>,
    entityClassName: string,
  ): EntityTableDataCoordinator<TFields, TIDField> {
    return computeIfAbsent(this.tableDataCoordinatorMap, entityConfiguration.tableName, () => {
      const entityDatabaseAdapterFlavor = this.databaseAdapterFlavors.get(
        entityConfiguration.databaseAdapterFlavor,
      );
      invariant(
        entityDatabaseAdapterFlavor,
        `No database adaptor configuration found for flavor: ${entityConfiguration.databaseAdapterFlavor}`,
      );

      const entityCacheAdapterFlavor = this.cacheAdapterFlavors.get(
        entityConfiguration.cacheAdapterFlavor,
      );
      invariant(
        entityCacheAdapterFlavor,
        `No cache adaptor configuration found for flavor: ${entityConfiguration.cacheAdapterFlavor}`,
      );

      return new EntityTableDataCoordinator(
        entityConfiguration,
        entityDatabaseAdapterFlavor.adapterProvider,
        entityCacheAdapterFlavor.cacheAdapterProvider,
        entityDatabaseAdapterFlavor.queryContextProvider,
        this.metricsAdapter,
        entityClassName,
      );
    });
  }
}

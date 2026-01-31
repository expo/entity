import { IEntityClass } from './Entity';
import { EntityConfiguration } from './EntityConfiguration';
import { EntityPrivacyPolicy } from './EntityPrivacyPolicy';
import { EntityTransactionalQueryContext } from './EntityQueryContext';
import { ReadonlyEntity } from './ReadonlyEntity';
import { ViewerContext } from './ViewerContext';
import { EntityDataManager } from './internal/EntityDataManager';
import { LoadPair } from './internal/EntityLoadInterfaces';
import { SingleFieldHolder, SingleFieldValueHolder } from './internal/SingleFieldHolder';
import { IEntityMetricsAdapter } from './metrics/IEntityMetricsAdapter';

/**
 * Entity invalidation utilities.
 * Methods are exposed publicly since in rare cases they may need to be called manually.
 */
export class EntityInvalidationUtils<
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
  constructor(
    private readonly entityConfiguration: EntityConfiguration<TFields, TIDField>,
    _entityClass: IEntityClass<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    private readonly dataManager: EntityDataManager<TFields, TIDField>,
    protected readonly metricsAdapter: IEntityMetricsAdapter,
  ) {}

  private getKeyValuePairsFromObjectFields(
    objectFields: Readonly<TFields>,
  ): readonly LoadPair<TFields, TIDField, any, any, any>[] {
    const keys = Object.keys(objectFields) as (keyof TFields)[];
    const singleFieldKeyValues: LoadPair<TFields, TIDField, any, any, any>[] = [];
    for (const fieldName of keys) {
      const value = objectFields[fieldName];
      if (value !== undefined && value !== null) {
        singleFieldKeyValues.push([
          new SingleFieldHolder<TFields, TIDField, typeof fieldName>(fieldName),
          new SingleFieldValueHolder(value),
        ]);
      }
    }

    const compositeFieldKeyValues: LoadPair<TFields, TIDField, any, any, any>[] = [];
    for (const compositeFieldHolder of this.entityConfiguration.compositeFieldInfo.getAllCompositeFieldHolders()) {
      const compositeFieldValueHolder =
        compositeFieldHolder.extractCompositeFieldValueHolderFromObjectFields(objectFields);
      if (compositeFieldValueHolder) {
        compositeFieldKeyValues.push([compositeFieldHolder, compositeFieldValueHolder]);
      }
    }

    return [...singleFieldKeyValues, ...compositeFieldKeyValues];
  }

  /**
   * Invalidate all caches and local dataloaders for an entity's fields. Exposed primarily for internal use by EntityMutator.
   * @param objectFields - entity data object to be invalidated
   */
  public async invalidateFieldsAsync(objectFields: Readonly<TFields>): Promise<void> {
    await this.dataManager.invalidateKeyValuePairsAsync(
      this.getKeyValuePairsFromObjectFields(objectFields),
    );
  }

  /**
   * Invalidate all local dataloaders specific to a transaction for an entity's fields. Exposed primarily for internal use by EntityMutator.
   * @param objectFields - entity data object to be invalidated
   */
  public invalidateFieldsForTransaction(
    queryContext: EntityTransactionalQueryContext,
    objectFields: Readonly<TFields>,
  ): void {
    this.dataManager.invalidateKeyValuePairsForTransaction(
      queryContext,
      this.getKeyValuePairsFromObjectFields(objectFields),
    );
  }

  /**
   * Invalidate all caches and local dataloaders for an entity. One potential use case would be to keep the entity
   * framework in sync with changes made to data outside of the framework.
   * @param entity - entity to be invalidated
   */
  public async invalidateEntityAsync(entity: TEntity): Promise<void> {
    await this.invalidateFieldsAsync(entity.getAllDatabaseFields());
  }

  /**
   * Invalidate all local dataloaders specific to a transaction for an entity. One potential use case would be to keep the entity
   * framework in sync with changes made to data outside of the framework.
   * @param entity - entity to be invalidated
   */
  public invalidateEntityForTransaction(
    queryContext: EntityTransactionalQueryContext,
    entity: TEntity,
  ): void {
    this.invalidateFieldsForTransaction(queryContext, entity.getAllDatabaseFields());
  }
}

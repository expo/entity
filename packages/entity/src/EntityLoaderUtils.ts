import { Result, asyncResult, result } from '@expo/results';
import nullthrows from 'nullthrows';

import { IEntityClass } from './Entity';
import { EntityConfiguration } from './EntityConfiguration';
import { EntityPrivacyPolicy, EntityPrivacyPolicyEvaluationContext } from './EntityPrivacyPolicy';
import { EntityQueryContext, EntityTransactionalQueryContext } from './EntityQueryContext';
import { ReadonlyEntity } from './ReadonlyEntity';
import { ViewerContext } from './ViewerContext';
import { pick } from './entityUtils';
import { EntityDataManager } from './internal/EntityDataManager';
import { LoadPair } from './internal/EntityLoadInterfaces';
import { SingleFieldHolder, SingleFieldValueHolder } from './internal/SingleFieldHolder';
import { IEntityMetricsAdapter } from './metrics/IEntityMetricsAdapter';
import { mapMapAsync } from './utils/collections/maps';

/**
 * Entity loader utilities for things like invalidation, entity construction, and authorization.
 * Methods are exposed publicly since in rare cases they may need to be called manually.
 */
export class EntityLoaderUtils<
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
    private readonly viewerContext: TViewerContext,
    private readonly queryContext: EntityQueryContext,
    private readonly privacyPolicyEvaluationContext: EntityPrivacyPolicyEvaluationContext<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
    private readonly entityConfiguration: EntityConfiguration<TFields, TIDField>,
    private readonly entityClass: IEntityClass<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    private readonly entitySelectedFields: TSelectedFields[] | undefined,
    private readonly privacyPolicy: TPrivacyPolicy,
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

  /**
   * Construct an entity from a fields object (applying field selection if applicable),
   * checking that the ID field is specified.
   *
   * @param fieldsObject - fields object
   */
  public constructEntity(fieldsObject: TFields): TEntity {
    const idField = this.entityConfiguration.idField;
    const id = nullthrows(fieldsObject[idField], 'must provide ID to create an entity');
    const entitySelectedFields =
      this.entitySelectedFields ?? Array.from(this.entityConfiguration.schema.keys());
    const selectedFields = pick(fieldsObject, entitySelectedFields);
    return new this.entityClass({
      viewerContext: this.viewerContext,
      id: id as TFields[TIDField],
      databaseFields: fieldsObject,
      selectedFields,
    });
  }

  /**
   * Construct and authorize entities from fields map, returning error results for entities that fail
   * to construct or fail to authorize.
   *
   * @param map - map from an arbitrary key type to an array of entity field objects
   */
  public async constructAndAuthorizeEntitiesAsync<K>(
    map: ReadonlyMap<K, readonly Readonly<TFields>[]>,
  ): Promise<ReadonlyMap<K, readonly Result<TEntity>[]>> {
    return await mapMapAsync(map, async (fieldObjects) => {
      return await this.constructAndAuthorizeEntitiesArrayAsync(fieldObjects);
    });
  }

  /**
   * Construct and authorize entities from field objects array, returning error results for entities that fail
   * to construct or fail to authorize.
   *
   * @param fieldObjects - array of field objects
   */
  public async constructAndAuthorizeEntitiesArrayAsync(
    fieldObjects: readonly Readonly<TFields>[],
  ): Promise<readonly Result<TEntity>[]> {
    const uncheckedEntityResults = this.tryConstructEntities(fieldObjects);
    return await Promise.all(
      uncheckedEntityResults.map(async (uncheckedEntityResult) => {
        if (!uncheckedEntityResult.ok) {
          return uncheckedEntityResult;
        }
        return await asyncResult(
          this.privacyPolicy.authorizeReadAsync(
            this.viewerContext,
            this.queryContext,
            this.privacyPolicyEvaluationContext,
            uncheckedEntityResult.value,
            this.metricsAdapter,
          ),
        );
      }),
    );
  }

  private tryConstructEntities(fieldsObjects: readonly TFields[]): readonly Result<TEntity>[] {
    return fieldsObjects.map((fieldsObject) => {
      try {
        return result(this.constructEntity(fieldsObject));
      } catch (e) {
        if (!(e instanceof Error)) {
          throw e;
        }
        return result(e);
      }
    });
  }
}

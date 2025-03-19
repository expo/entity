import { Result, asyncResult, result } from '@expo/results';
import nullthrows from 'nullthrows';

import { IEntityClass } from './Entity';
import EntityConfiguration, {
  EntityCompositeField,
  EntityCompositeFieldValue,
} from './EntityConfiguration';
import EntityPrivacyPolicy, { EntityPrivacyPolicyEvaluationContext } from './EntityPrivacyPolicy';
import { EntityQueryContext } from './EntityQueryContext';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerContext from './ViewerContext';
import { pick } from './entityUtils';
import { CompositeFieldValueHolderReadonlyMap } from './internal/CompositeFieldValueHolderMap';
import { CompositeFieldValueMap } from './internal/CompositeFieldValueMap';
import EntityDataManager from './internal/EntityDataManager';
import IEntityMetricsAdapter from './metrics/IEntityMetricsAdapter';
import { mapMapAsync } from './utils/collections/maps';

/**
 * Entity loader utilities for things like invalidation, entity construction, and authorization.
 * Methods are exposed publicly since in rare cases they may need to be called manually.
 */
export default class EntityLoaderUtils<
  TFields extends object,
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
  TSelectedFields extends keyof TFields,
> {
  constructor(
    private readonly viewerContext: TViewerContext,
    private readonly queryContext: EntityQueryContext,
    private readonly privacyPolicyEvaluationContext: EntityPrivacyPolicyEvaluationContext<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
    private readonly entityConfiguration: EntityConfiguration<TFields>,
    private readonly entityClass: IEntityClass<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    private readonly entitySelectedFields: TSelectedFields[] | undefined,
    private readonly privacyPolicy: TPrivacyPolicy,
    private readonly dataManager: EntityDataManager<TFields>,
    protected readonly metricsAdapter: IEntityMetricsAdapter,
  ) {}

  /**
   * Invalidate all caches for an entity's fields. Exposed primarily for internal use by EntityMutator.
   * @param objectFields - entity data object to be invalidated
   */
  async invalidateFieldsAsync(objectFields: Readonly<TFields>): Promise<void> {
    await this.dataManager.invalidateObjectFieldsAsync(objectFields);
  }

  /**
   * Invalidate all caches for an entity. One potential use case would be to keep the entity
   * framework in sync with changes made to data outside of the framework.
   * @param entity - entity to be invalidated
   */
  async invalidateEntityAsync(entity: TEntity): Promise<void> {
    await this.invalidateFieldsAsync(entity.getAllDatabaseFields());
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
      id: id as TID,
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
   * Construct and authorize entities from fields serializable key map, returning error results for entities that fail
   * to construct or fail to authorize.
   *
   * @param map - serializable key map from an arbitrary key type to an array of entity field objects
   */
  public async constructAndAuthorizeEntitiesFromCompositeFieldValueHolderMapAsync<
    N extends EntityCompositeField<Pick<TFields, TSelectedFields>>,
  >(
    map: CompositeFieldValueHolderReadonlyMap<TFields, N, readonly Readonly<TFields>[]>,
  ): Promise<ReadonlyMap<EntityCompositeFieldValue<TFields, N>, readonly Result<TEntity>[]>> {
    return new CompositeFieldValueMap(
      await Promise.all(
        Array.from(map.entries()).map(async ([compositeFieldValueHolder, fieldObjects]) => {
          return [
            compositeFieldValueHolder,
            await this.constructAndAuthorizeEntitiesArrayAsync(fieldObjects),
          ];
        }),
      ),
    );
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

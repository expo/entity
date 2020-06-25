import { Result, asyncResult, result, enforceAsyncResult } from '@expo/results';
import _ from 'lodash';

import Entity, { IEntityClass } from './Entity';
import EntityDatabaseAdapter from './EntityDatabaseAdapter';
import EntityLoaderFactory from './EntityLoaderFactory';
import EntityPrivacyPolicy from './EntityPrivacyPolicy';
import { EntityQueryContext } from './EntityQueryContext';
import ViewerContext from './ViewerContext';
import { timeAndLogMutationEventAsync } from './metrics/EntityMetricsUtils';
import IEntityMetricsAdapter, { EntityMetricsMutationType } from './metrics/IEntityMetricsAdapter';

abstract class BaseMutator<
  TFields,
  TID,
  TViewerContext extends ViewerContext,
  TEntity extends Entity<TFields, TID, TViewerContext, TSelectedFields>,
  TPrivacyPolicy extends EntityPrivacyPolicy<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TSelectedFields
  >,
  TSelectedFields extends keyof TFields = keyof TFields
> {
  constructor(
    protected readonly viewerContext: TViewerContext,
    protected readonly queryContext: EntityQueryContext,
    protected readonly idField: keyof TFields,
    protected readonly entityClass: IEntityClass<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    protected readonly privacyPolicy: TPrivacyPolicy,
    protected readonly entityLoaderFactory: EntityLoaderFactory<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    protected readonly databaseAdapter: EntityDatabaseAdapter<TFields>,
    protected readonly metricsAdapter: IEntityMetricsAdapter
  ) {}
}

/**
 * Mutator for creating a new entity.
 */
export class CreateMutator<
  TFields,
  TID,
  TViewerContext extends ViewerContext,
  TEntity extends Entity<TFields, TID, TViewerContext, TSelectedFields>,
  TPrivacyPolicy extends EntityPrivacyPolicy<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TSelectedFields
  >,
  TSelectedFields extends keyof TFields = keyof TFields
> extends BaseMutator<TFields, TID, TViewerContext, TEntity, TPrivacyPolicy, TSelectedFields> {
  private readonly fieldsForEntity: Partial<TFields> = {};

  /**
   * Set the value for entity field.
   * @param fieldName - entity field being updated
   * @param value - value for entity field
   */
  setField<K extends keyof TFields>(fieldName: K, value: TFields[K]): this {
    this.fieldsForEntity[fieldName] = value;
    return this;
  }

  /**
   * Commit the new entity after authorizing against creation privacy rules. Invalidates all caches for
   * queries that would return new entity and caches the new entity if not in a transactional query context.
   * @returns authorized, cached, newly-created entity result, where result error can be UnauthorizedError
   */
  async createAsync(): Promise<Result<TEntity>> {
    return await timeAndLogMutationEventAsync(
      this.metricsAdapter,
      EntityMetricsMutationType.CREATE
    )(this.createInternalAsync());
  }

  /**
   * Convenience method that returns the new entity or throws upon create failure.
   */
  async enforceCreateAsync(): Promise<TEntity> {
    return await enforceAsyncResult(this.createAsync());
  }

  private async createInternalAsync(): Promise<Result<TEntity>> {
    const temporaryEntityForPrivacyCheck = new this.entityClass(this.viewerContext, ({
      [this.idField]: '00000000-0000-0000-0000-000000000000', // zero UUID
      ...this.fieldsForEntity,
    } as unknown) as TFields);

    const authorizeCreateResult = await asyncResult(
      this.privacyPolicy.authorizeCreateAsync(
        this.viewerContext,
        this.queryContext,
        temporaryEntityForPrivacyCheck
      )
    );
    if (!authorizeCreateResult.ok) {
      return authorizeCreateResult;
    }

    const insertResult = await this.databaseAdapter.insertAsync(
      this.queryContext,
      this.fieldsForEntity
    );

    const entityLoader = this.entityLoaderFactory.forLoad(this.viewerContext, this.queryContext);
    await entityLoader.invalidateFieldsAsync(insertResult);

    const unauthorizedEntityAfterInsert = new this.entityClass(this.viewerContext, insertResult);
    return await entityLoader.loadByIDAsync(unauthorizedEntityAfterInsert.getID());
  }
}

/**
 * Mutator for updating an existing entity.
 */
export class UpdateMutator<
  TFields,
  TID,
  TViewerContext extends ViewerContext,
  TEntity extends Entity<TFields, TID, TViewerContext, TSelectedFields>,
  TPrivacyPolicy extends EntityPrivacyPolicy<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TSelectedFields
  >,
  TSelectedFields extends keyof TFields = keyof TFields
> extends BaseMutator<TFields, TID, TViewerContext, TEntity, TPrivacyPolicy, TSelectedFields> {
  private readonly originalFieldsForEntity: Readonly<TFields>;
  private readonly fieldsForEntity: TFields;
  private readonly updatedFields: Partial<TFields> = {};

  constructor(
    viewerContext: TViewerContext,
    queryContext: EntityQueryContext,
    idField: keyof TFields,
    entityClass: IEntityClass<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    privacyPolicy: TPrivacyPolicy,
    entityLoaderFactory: EntityLoaderFactory<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    databaseAdapter: EntityDatabaseAdapter<TFields>,
    metricsAdapter: IEntityMetricsAdapter,
    fieldsForEntity: Readonly<TFields>
  ) {
    super(
      viewerContext,
      queryContext,
      idField,
      entityClass,
      privacyPolicy,
      entityLoaderFactory,
      databaseAdapter,
      metricsAdapter
    );
    this.originalFieldsForEntity = _.cloneDeep(fieldsForEntity);
    this.fieldsForEntity = _.cloneDeep(fieldsForEntity);
  }

  /**
   * Set the value for entity field.
   * @param fieldName - entity field being updated
   * @param value - value for entity field
   */
  setField<K extends keyof TFields>(fieldName: K, value: TFields[K]): this {
    this.fieldsForEntity[fieldName] = value;
    this.updatedFields[fieldName] = value;
    return this;
  }

  /**
   * Commit the changes to the entity after authorizing against update privacy rules.
   * Invalidates all caches for pre-update entity and caches the updated entity if not in a
   * transactional query context.
   * @returns authorized updated entity result, where result error can be UnauthorizedError
   */
  async updateAsync(): Promise<Result<TEntity>> {
    return await timeAndLogMutationEventAsync(
      this.metricsAdapter,
      EntityMetricsMutationType.UPDATE
    )(this.updateInternalAsync());
  }

  /**
   * Convenience method that returns the updated entity or throws upon update failure.
   */
  async enforceUpdateAsync(): Promise<TEntity> {
    return await enforceAsyncResult(this.updateAsync());
  }

  private async updateInternalAsync(): Promise<Result<TEntity>> {
    const entityAboutToBeUpdated = new this.entityClass(this.viewerContext, this.fieldsForEntity);
    const authorizeUpdateResult = await asyncResult(
      this.privacyPolicy.authorizeUpdateAsync(
        this.viewerContext,
        this.queryContext,
        entityAboutToBeUpdated
      )
    );
    if (!authorizeUpdateResult.ok) {
      return authorizeUpdateResult;
    }

    const updateResult = await this.databaseAdapter.updateAsync(
      this.queryContext,
      this.idField,
      entityAboutToBeUpdated.getID(),
      this.updatedFields
    );

    const entityLoader = this.entityLoaderFactory.forLoad(this.viewerContext, this.queryContext);

    await entityLoader.invalidateFieldsAsync(this.originalFieldsForEntity);
    await entityLoader.invalidateFieldsAsync(this.fieldsForEntity);

    const unauthorizedEntityAfterUpdate = new this.entityClass(this.viewerContext, updateResult);
    return await entityLoader.loadByIDAsync(unauthorizedEntityAfterUpdate.getID());
  }
}

/**
 * Mutator for deleting an existing entity.
 */
export class DeleteMutator<
  TFields,
  TID,
  TViewerContext extends ViewerContext,
  TEntity extends Entity<TFields, TID, TViewerContext, TSelectedFields>,
  TPrivacyPolicy extends EntityPrivacyPolicy<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TSelectedFields
  >,
  TSelectedFields extends keyof TFields = keyof TFields
> extends BaseMutator<TFields, TID, TViewerContext, TEntity, TPrivacyPolicy, TSelectedFields> {
  constructor(
    viewerContext: TViewerContext,
    queryContext: EntityQueryContext,
    idField: keyof TFields,
    entityClass: IEntityClass<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    privacyPolicy: TPrivacyPolicy,
    entityLoaderFactory: EntityLoaderFactory<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    databaseAdapter: EntityDatabaseAdapter<TFields>,
    metricsAdapter: IEntityMetricsAdapter,
    private readonly entity: TEntity
  ) {
    super(
      viewerContext,
      queryContext,
      idField,
      entityClass,
      privacyPolicy,
      entityLoaderFactory,
      databaseAdapter,
      metricsAdapter
    );
  }

  /**
   * Delete the entity after authorizing against delete privacy rules. The entity is invalidated in all caches.
   * @returns void result, where result error can be UnauthorizedError
   */
  async deleteAsync(): Promise<Result<void>> {
    return await timeAndLogMutationEventAsync(
      this.metricsAdapter,
      EntityMetricsMutationType.DELETE
    )(this.deleteInternalAsync());
  }

  /**
   * Convenience method that throws upon delete failure.
   */
  async enforceDeleteAsync(): Promise<void> {
    return await enforceAsyncResult(this.deleteAsync());
  }

  private async deleteInternalAsync(): Promise<Result<void>> {
    const authorizeDeleteResult = await asyncResult(
      this.privacyPolicy.authorizeDeleteAsync(this.viewerContext, this.queryContext, this.entity)
    );
    if (!authorizeDeleteResult.ok) {
      return authorizeDeleteResult;
    }

    const id = this.entity.getID();

    await this.databaseAdapter.deleteAsync(this.queryContext, this.idField, id);

    const entityLoader = this.entityLoaderFactory.forLoad(this.viewerContext, this.queryContext);
    await entityLoader.invalidateFieldsAsync(this.entity.getAllDatabaseFields());

    return result();
  }
}

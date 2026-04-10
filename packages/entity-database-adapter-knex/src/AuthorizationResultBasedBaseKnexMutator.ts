import type {
  EntityConstructionUtils,
  EntityPrivacyPolicy,
  EntityQueryContext,
  IEntityMetricsAdapter,
  ReadonlyEntity,
  ViewerContext,
} from '@expo/entity';
import type { Result } from '@expo/results';

import type { BasePostgresEntityDatabaseAdapter } from './BasePostgresEntityDatabaseAdapter.ts';
import type { SQLFragment } from './SQLOperator.ts';

/**
 * Controls how update authorization is performed for bulk updateWhere operations.
 */
export enum UpdateWhereAuthorizationBehavior {
  /**
   * Authorize every updated entity individually against the update privacy rules.
   * This is the safest option but may be slow for large result sets.
   */
  NONE = 'NONE',

  /**
   * Authorize a single updated entity and infer that all other updated entities
   * in the result set have the same authorization outcome. Use this when the WHERE
   * clause selects entities with uniform authorization semantics.
   */
  ONE_IMPLIES_ALL = 'ONE_IMPLIES_ALL',

  /**
   * Skip update authorization entirely. Only read authorization is performed
   * on the returned entities. Use this for trusted internal operations where
   * update authorization is handled by the caller.
   */
  SKIP_AUTHORIZATION = 'SKIP_AUTHORIZATION',
}

/**
 * Authorization-result-based knex entity mutator for non-data-loader-based mutation methods.
 * All mutations through this mutator are results, where an unsuccessful result means an
 * authorization error or entity construction error occurred. Other errors are thrown.
 */
export class AuthorizationResultBasedBaseKnexMutator<
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
  constructor(
    private readonly queryContext: EntityQueryContext,
    private readonly databaseAdapter: BasePostgresEntityDatabaseAdapter<TFields, TIDField>,
    protected readonly metricsAdapter: IEntityMetricsAdapter,
    private readonly constructionUtils: EntityConstructionUtils<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
  ) {}

  /**
   * Start building an update-where mutation using a SQL WHERE clause fragment.
   *
   * @param whereSQLFragment - SQLFragment for the WHERE clause determining which rows to update
   * @param authorizationBehavior - controls how update authorization is performed on the result set
   * @returns a builder with setField/updateAsync methods
   */
  updateWhere(
    whereSQLFragment: SQLFragment<Pick<TFields, TSelectedFields>>,
    authorizationBehavior: UpdateWhereAuthorizationBehavior,
  ): AuthorizationResultBasedUpdateWhereBuilder<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    return new AuthorizationResultBasedUpdateWhereBuilder(
      this.queryContext,
      this.databaseAdapter,
      this.constructionUtils,
      whereSQLFragment,
      authorizationBehavior,
    );
  }
}

/**
 * Builder for constructing and executing an update-where mutation with authorization result handling.
 */
export class AuthorizationResultBasedUpdateWhereBuilder<
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
  private readonly updatedFields: Partial<TFields> = {};

  constructor(
    private readonly queryContext: EntityQueryContext,
    private readonly databaseAdapter: BasePostgresEntityDatabaseAdapter<TFields, TIDField>,
    private readonly constructionUtils: EntityConstructionUtils<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    private readonly whereSQLFragment: SQLFragment<Pick<TFields, TSelectedFields>>,
    private readonly authorizationBehavior: UpdateWhereAuthorizationBehavior,
  ) {}

  /**
   * Set the value for an entity field to update.
   * @param fieldName - entity field being updated
   * @param value - value for entity field
   */
  setField<K extends keyof Pick<TFields, TSelectedFields>>(fieldName: K, value: TFields[K]): this {
    this.updatedFields[fieldName] = value;
    return this;
  }

  /**
   * Execute the update and return authorization results for each updated entity.
   * Update authorization is performed according to the configured authorization behavior,
   * followed by read authorization on all returned entities.
   * @returns array of entity results for each updated row, where result error can be UnauthorizedError
   */
  async updateAsync(): Promise<readonly Result<TEntity>[]> {
    const fieldObjects = await this.databaseAdapter.updateWhereBySQLFragmentAsync(
      this.queryContext,
      this.whereSQLFragment as SQLFragment<TFields>,
      this.updatedFields,
    );

    if (fieldObjects.length === 0) {
      return [];
    }

    // Perform update authorization based on the configured behavior
    switch (this.authorizationBehavior) {
      case UpdateWhereAuthorizationBehavior.NONE: {
        // Authorize every entity individually for update, then read-authorize
        const entityResults =
          await this.constructionUtils.constructAndAuthorizeEntitiesArrayAsync(fieldObjects);
        return await Promise.all(
          entityResults.map(async (entityResult) => {
            if (!entityResult.ok) {
              return entityResult;
            }
            return await this.constructionUtils.authorizeUpdateEntityAsync(entityResult.value);
          }),
        );
      }

      case UpdateWhereAuthorizationBehavior.ONE_IMPLIES_ALL: {
        // Authorize one entity for update; if it passes, skip update auth for the rest
        const firstEntityResults =
          await this.constructionUtils.constructAndAuthorizeEntitiesArrayAsync([fieldObjects[0]!]);
        const firstEntityResult = firstEntityResults[0]!;
        if (!firstEntityResult.ok) {
          // Read auth failed on the representative entity — return failure for all
          return fieldObjects.map(() => firstEntityResult);
        }

        const updateAuthResult = await this.constructionUtils.authorizeUpdateEntityAsync(
          firstEntityResult.value,
        );
        if (!updateAuthResult.ok) {
          // Update auth failed on the representative entity — return failure for all
          return fieldObjects.map(() => updateAuthResult);
        }

        // Representative passed; construct and read-authorize the rest
        return await this.constructionUtils.constructAndAuthorizeEntitiesArrayAsync(fieldObjects);
      }

      case UpdateWhereAuthorizationBehavior.SKIP_AUTHORIZATION: {
        // Only read-authorize the returned entities
        return await this.constructionUtils.constructAndAuthorizeEntitiesArrayAsync(fieldObjects);
      }
    }
  }
}

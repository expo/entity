import type {
  EntityConstructionUtils,
  EntityPrivacyPolicy,
  EntityQueryContext,
  IEntityMetricsAdapter,
  ReadonlyEntity,
  ViewerContext,
} from '@expo/entity';

import type {
  AuthorizationResultBasedBaseKnexMutator,
  AuthorizationResultBasedUpdateWhereBuilder,
  UpdateWhereAuthorizationBehavior,
} from './AuthorizationResultBasedBaseKnexMutator.ts';
import type { BasePostgresEntityDatabaseAdapter } from './BasePostgresEntityDatabaseAdapter.ts';
import type { SQLFragment } from './SQLOperator.ts';

/**
 * Enforcing knex entity mutator for non-data-loader-based mutation methods.
 * All mutations through this mutator will throw if the mutation is not successful.
 */
export class EnforcingBaseKnexMutator<
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
    private readonly knexMutator: AuthorizationResultBasedBaseKnexMutator<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    protected readonly queryContext: EntityQueryContext,
    protected readonly databaseAdapter: BasePostgresEntityDatabaseAdapter<TFields, TIDField>,
    protected readonly metricsAdapter: IEntityMetricsAdapter,
    protected readonly constructionUtils: EntityConstructionUtils<
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
   * When executed, the mutation will throw if authorization fails for any updated entity.
   *
   * @param whereSQLFragment - SQLFragment for the WHERE clause determining which rows to update
   * @param authorizationBehavior - controls how update authorization is performed on the result set
   * @returns a builder with setField/updateAsync methods
   */
  updateWhere(
    whereSQLFragment: SQLFragment<Pick<TFields, TSelectedFields>>,
    authorizationBehavior: UpdateWhereAuthorizationBehavior,
  ): EnforcingUpdateWhereBuilder<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    return new EnforcingUpdateWhereBuilder(
      this.knexMutator.updateWhere(whereSQLFragment, authorizationBehavior),
    );
  }
}

/**
 * Builder for constructing and executing an update-where mutation with enforced authorization.
 */
export class EnforcingUpdateWhereBuilder<
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
    private readonly authorizationResultBasedBuilder: AuthorizationResultBasedUpdateWhereBuilder<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
  ) {}

  /**
   * Set the value for an entity field to update.
   * @param fieldName - entity field being updated
   * @param value - value for entity field
   */
  setField<K extends keyof Pick<TFields, TSelectedFields>>(fieldName: K, value: TFields[K]): this {
    this.authorizationResultBasedBuilder.setField(fieldName, value);
    return this;
  }

  /**
   * Execute the update and return the updated entities.
   * @throws EntityNotAuthorizedError if viewer is not authorized to view any updated entity
   * @returns array of updated entities
   */
  async updateAsync(): Promise<readonly TEntity[]> {
    const entityResults = await this.authorizationResultBasedBuilder.updateAsync();
    return entityResults.map((r) => r.enforceValue());
  }
}

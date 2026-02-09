import invariant from 'invariant';

import { AuthorizationResultBasedEntityAssociationLoader } from './AuthorizationResultBasedEntityAssociationLoader';
import { AuthorizationResultBasedEntityLoader } from './AuthorizationResultBasedEntityLoader';
import { AuthorizationResultBasedKnexEntityLoader } from './AuthorizationResultBasedKnexEntityLoader';
import { EnforcingEntityAssociationLoader } from './EnforcingEntityAssociationLoader';
import { EnforcingEntityLoader } from './EnforcingEntityLoader';
import { EnforcingKnexEntityLoader } from './EnforcingKnexEntityLoader';
import { IEntityClass } from './Entity';
import { EntityAssociationLoader } from './EntityAssociationLoader';
import { EntityLoader } from './EntityLoader';
import { EntityLoaderUtils } from './EntityLoaderUtils';
import { EntityPrivacyPolicy } from './EntityPrivacyPolicy';
import { EntityQueryContext } from './EntityQueryContext';
import { KnexEntityLoader } from './KnexEntityLoader';
import { ViewerContext } from './ViewerContext';

/**
 * A readonly entity exposes only the read functionality of an Entity. Used as the base
 * type for most entity operations excluding mutations.
 *
 * This is also useful as a base class for Entities that should not be mutated, such as:
 * - Entities representing SQL views.
 * - Entities representing immutable tables.
 */
export abstract class ReadonlyEntity<
  TFields extends Record<string, any>,
  TIDField extends keyof NonNullable<Pick<TFields, TSelectedFields>>,
  TViewerContext extends ViewerContext,
  TSelectedFields extends keyof TFields = keyof TFields,
> {
  private readonly viewerContext: TViewerContext;
  private readonly id: TFields[TIDField];
  private readonly databaseFields: Readonly<TFields>;
  private readonly selectedFields: Readonly<Pick<TFields, TSelectedFields>>;

  /**
   * Constructs an instance of an Entity.
   *
   * @param constructorParam - data needed to construct an instance of an entity
   * viewerContext - the ViewerContext reading this entity
   * id - the ID of this entity
   * databaseFields - all underlying fields for this entity's data
   * selectedFields - selected fields for this entity from TSelectedFields type
   *
   * This should only be overridden in cases where additional data validation is needed.
   * The params should not be modified when calling super during constructions.
   *
   * @internal
   */
  constructor({
    viewerContext,
    id,
    databaseFields,
    selectedFields,
  }: {
    viewerContext: TViewerContext;
    id: TFields[TIDField];
    databaseFields: Readonly<TFields>;
    selectedFields: Readonly<Pick<TFields, TSelectedFields>>;
  }) {
    invariant(id !== null && id !== undefined, 'id must be non-null');

    this.viewerContext = viewerContext;
    this.id = id;
    this.databaseFields = databaseFields;
    this.selectedFields = selectedFields;
  }

  toString(): string {
    return `${this.constructor.name}[${this.getID()}]`;
  }

  getUniqueIdentifier(): string {
    return this.toString();
  }

  /**
   * @returns the ViewerContext authorized to read this entity
   */
  getViewerContext(): TViewerContext {
    return this.viewerContext;
  }

  /**
   * @returns the ID of this entity
   */
  getID(): TFields[TIDField] {
    return this.id;
  }

  /**
   * @returns EnforcingEntityAssociationLoader for this entity
   */
  associationLoader(
    queryContext?: EntityQueryContext,
  ): EnforcingEntityAssociationLoader<TFields, TIDField, TViewerContext, this, TSelectedFields> {
    return new EntityAssociationLoader<TFields, TIDField, TViewerContext, this, TSelectedFields>(
      this,
      queryContext,
    ).enforcing();
  }

  /**
   * @returns AuthorizationResultBasedEntityAssociationLoader for this entity
   */
  associationLoaderWithAuthorizationResults(
    queryContext?: EntityQueryContext,
  ): AuthorizationResultBasedEntityAssociationLoader<
    TFields,
    TIDField,
    TViewerContext,
    this,
    TSelectedFields
  > {
    return new EntityAssociationLoader<TFields, TIDField, TViewerContext, this, TSelectedFields>(
      this,
      queryContext,
    ).withAuthorizationResults();
  }

  /**
   * Get a underlying field from this entity's data
   * @param fieldName - the field to get
   * @returns the value of the field or undefined if not loaded with that field
   */
  getField<K extends keyof Pick<TFields, TSelectedFields>>(
    fieldName: K,
  ): Pick<TFields, TSelectedFields>[K] {
    return this.selectedFields[fieldName];
  }

  /**
   * @returns all underlying fields from this entity's data
   */
  getAllFields(): Readonly<Pick<TFields, TSelectedFields>> {
    return { ...this.selectedFields };
  }

  /**
   * @returns all underlying fields from this entity's database data
   */
  getAllDatabaseFields(): Readonly<TFields> {
    return { ...this.databaseFields };
  }

  /**
   * Vend loader for loading an entity in a given query context.
   * @param viewerContext - viewer context of loading user
   * @param queryContext - query context in which to perform the load
   */
  static loader<
    TMFields extends object,
    TMIDField extends keyof NonNullable<Pick<TMFields, TMSelectedFields>>,
    TMViewerContext extends ViewerContext,
    TMViewerContext2 extends TMViewerContext,
    TMEntity extends ReadonlyEntity<TMFields, TMIDField, TMViewerContext, TMSelectedFields>,
    TMPrivacyPolicy extends EntityPrivacyPolicy<
      TMFields,
      TMIDField,
      TMViewerContext,
      TMEntity,
      TMSelectedFields
    >,
    TMSelectedFields extends keyof TMFields = keyof TMFields,
  >(
    this: IEntityClass<
      TMFields,
      TMIDField,
      TMViewerContext,
      TMEntity,
      TMPrivacyPolicy,
      TMSelectedFields
    >,
    viewerContext: TMViewerContext2,
    queryContext: EntityQueryContext = viewerContext
      .getViewerScopedEntityCompanionForClass(this)
      .getQueryContextProvider()
      .getQueryContext(),
  ): EnforcingEntityLoader<
    TMFields,
    TMIDField,
    TMViewerContext,
    TMEntity,
    TMPrivacyPolicy,
    TMSelectedFields
  > {
    return new EntityLoader(viewerContext, queryContext, this).enforcing();
  }

  /**
   * Vend loader for loading an entity in a given query context.
   * @param viewerContext - viewer context of loading user
   * @param queryContext - query context in which to perform the load
   */
  static loaderWithAuthorizationResults<
    TMFields extends object,
    TMIDField extends keyof NonNullable<Pick<TMFields, TMSelectedFields>>,
    TMViewerContext extends ViewerContext,
    TMViewerContext2 extends TMViewerContext,
    TMEntity extends ReadonlyEntity<TMFields, TMIDField, TMViewerContext, TMSelectedFields>,
    TMPrivacyPolicy extends EntityPrivacyPolicy<
      TMFields,
      TMIDField,
      TMViewerContext,
      TMEntity,
      TMSelectedFields
    >,
    TMSelectedFields extends keyof TMFields = keyof TMFields,
  >(
    this: IEntityClass<
      TMFields,
      TMIDField,
      TMViewerContext,
      TMEntity,
      TMPrivacyPolicy,
      TMSelectedFields
    >,
    viewerContext: TMViewerContext2,
    queryContext: EntityQueryContext = viewerContext
      .getViewerScopedEntityCompanionForClass(this)
      .getQueryContextProvider()
      .getQueryContext(),
  ): AuthorizationResultBasedEntityLoader<
    TMFields,
    TMIDField,
    TMViewerContext,
    TMEntity,
    TMPrivacyPolicy,
    TMSelectedFields
  > {
    return new EntityLoader(viewerContext, queryContext, this).withAuthorizationResults();
  }

  /**
   * Vend loader for loading an entity in a given query context.
   * @param viewerContext - viewer context of loading user
   * @param queryContext - query context in which to perform the load
   */
  static loaderUtils<
    TMFields extends object,
    TMIDField extends keyof NonNullable<Pick<TMFields, TMSelectedFields>>,
    TMViewerContext extends ViewerContext,
    TMViewerContext2 extends TMViewerContext,
    TMEntity extends ReadonlyEntity<TMFields, TMIDField, TMViewerContext, TMSelectedFields>,
    TMPrivacyPolicy extends EntityPrivacyPolicy<
      TMFields,
      TMIDField,
      TMViewerContext,
      TMEntity,
      TMSelectedFields
    >,
    TMSelectedFields extends keyof TMFields = keyof TMFields,
  >(
    this: IEntityClass<
      TMFields,
      TMIDField,
      TMViewerContext,
      TMEntity,
      TMPrivacyPolicy,
      TMSelectedFields
    >,
    viewerContext: TMViewerContext2,
    queryContext: EntityQueryContext = viewerContext
      .getViewerScopedEntityCompanionForClass(this)
      .getQueryContextProvider()
      .getQueryContext(),
  ): EntityLoaderUtils<
    TMFields,
    TMIDField,
    TMViewerContext,
    TMEntity,
    TMPrivacyPolicy,
    TMSelectedFields
  > {
    return new EntityLoader(viewerContext, queryContext, this).utils();
  }

  /**
   * Vend knex loader for loading entities via non-data-loader methods in a given query context.
   * @param viewerContext - viewer context of loading user
   * @param queryContext - query context in which to perform the load
   */
  static knexLoader<
    TMFields extends object,
    TMIDField extends keyof NonNullable<Pick<TMFields, TMSelectedFields>>,
    TMViewerContext extends ViewerContext,
    TMViewerContext2 extends TMViewerContext,
    TMEntity extends ReadonlyEntity<TMFields, TMIDField, TMViewerContext, TMSelectedFields>,
    TMPrivacyPolicy extends EntityPrivacyPolicy<
      TMFields,
      TMIDField,
      TMViewerContext,
      TMEntity,
      TMSelectedFields
    >,
    TMSelectedFields extends keyof TMFields = keyof TMFields,
  >(
    this: IEntityClass<
      TMFields,
      TMIDField,
      TMViewerContext,
      TMEntity,
      TMPrivacyPolicy,
      TMSelectedFields
    >,
    viewerContext: TMViewerContext2,
    queryContext: EntityQueryContext = viewerContext
      .getViewerScopedEntityCompanionForClass(this)
      .getQueryContextProvider()
      .getQueryContext(),
  ): EnforcingKnexEntityLoader<
    TMFields,
    TMIDField,
    TMViewerContext,
    TMEntity,
    TMPrivacyPolicy,
    TMSelectedFields
  > {
    return new KnexEntityLoader(viewerContext, queryContext, this).enforcing();
  }

  /**
   * Vend knex loader for loading entities via non-data-loader methods in a given query context.
   * @param viewerContext - viewer context of loading user
   * @param queryContext - query context in which to perform the load
   */
  static knexLoaderWithAuthorizationResults<
    TMFields extends object,
    TMIDField extends keyof NonNullable<Pick<TMFields, TMSelectedFields>>,
    TMViewerContext extends ViewerContext,
    TMViewerContext2 extends TMViewerContext,
    TMEntity extends ReadonlyEntity<TMFields, TMIDField, TMViewerContext, TMSelectedFields>,
    TMPrivacyPolicy extends EntityPrivacyPolicy<
      TMFields,
      TMIDField,
      TMViewerContext,
      TMEntity,
      TMSelectedFields
    >,
    TMSelectedFields extends keyof TMFields = keyof TMFields,
  >(
    this: IEntityClass<
      TMFields,
      TMIDField,
      TMViewerContext,
      TMEntity,
      TMPrivacyPolicy,
      TMSelectedFields
    >,
    viewerContext: TMViewerContext2,
    queryContext: EntityQueryContext = viewerContext
      .getViewerScopedEntityCompanionForClass(this)
      .getQueryContextProvider()
      .getQueryContext(),
  ): AuthorizationResultBasedKnexEntityLoader<
    TMFields,
    TMIDField,
    TMViewerContext,
    TMEntity,
    TMPrivacyPolicy,
    TMSelectedFields
  > {
    return new KnexEntityLoader(viewerContext, queryContext, this).withAuthorizationResults();
  }
}

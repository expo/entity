import invariant from 'invariant';

import type { AuthorizationResultBasedEntityAssociationLoader } from './AuthorizationResultBasedEntityAssociationLoader.ts';
import type { AuthorizationResultBasedEntityLoader } from './AuthorizationResultBasedEntityLoader.ts';
import type { EnforcingEntityAssociationLoader } from './EnforcingEntityAssociationLoader.ts';
import type { EnforcingEntityLoader } from './EnforcingEntityLoader.ts';
import type { IEntityClass } from './Entity.ts';
import { EntityAssociationLoader } from './EntityAssociationLoader.ts';
import type { EntityInvalidationUtils } from './EntityInvalidationUtils.ts';
import { EntityLoader } from './EntityLoader.ts';
import type { EntityPrivacyPolicy } from './EntityPrivacyPolicy.ts';
import type { EntityQueryContext } from './EntityQueryContext.ts';
import type { ViewerContext } from './ViewerContext.ts';

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
   * Utilities for entity invalidation.
   * Call these manually to keep entity cache consistent when performing operations outside of the entity framework.
   */
  static invalidationUtils<
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
  ): EntityInvalidationUtils<
    TMFields,
    TMIDField,
    TMViewerContext,
    TMEntity,
    TMPrivacyPolicy,
    TMSelectedFields
  > {
    return viewerContext
      .getViewerScopedEntityCompanionForClass(this)
      .getLoaderFactory()
      .invalidationUtils();
  }
}

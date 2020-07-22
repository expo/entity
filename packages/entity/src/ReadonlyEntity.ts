import invariant from 'invariant';
import { pick } from 'lodash';

import { IEntityClass } from './Entity';
import EntityAssociationLoader from './EntityAssociationLoader';
import { EntityCompanionDefinition } from './EntityCompanionProvider';
import EntityLoader from './EntityLoader';
import EntityPrivacyPolicy from './EntityPrivacyPolicy';
import { EntityQueryContext } from './EntityQueryContext';
import ViewerContext from './ViewerContext';

/**
 * A readonly entity exposes only the read functionality of an Entity. Used as the base
 * type for most entity operations excluding mutations.
 *
 * This is also useful as a base class for Entities that should not be mutated, such as:
 * - Entities representing SQL views.
 * - Entities representing immutable tables.
 */
export default abstract class ReadonlyEntity<
  TFields,
  TID,
  TViewerContext extends ViewerContext,
  TSelectedFields extends keyof TFields = keyof TFields
> {
  private readonly id: TID;
  private readonly rawFields: Readonly<Pick<TFields, TSelectedFields>>;

  /**
   * Constructs an instance of an Entity.
   * @param viewerContext - the ViewerContext reading this entity
   * @param rawFields - all underlying fields for this entity's data
   *
   * @internal
   */
  constructor(
    private readonly viewerContext: TViewerContext,
    private readonly databaseFields: Readonly<TFields>
  ) {
    const companionDefinition = (this
      .constructor as any).getCompanionDefinition() as EntityCompanionDefinition<
      TFields,
      TID,
      TViewerContext,
      this,
      EntityPrivacyPolicy<TFields, TID, TViewerContext, this, TSelectedFields>,
      TSelectedFields
    >;
    const idField = companionDefinition.entityConfiguration.idField as keyof Pick<
      TFields,
      TSelectedFields
    >;
    const id = databaseFields[idField];
    invariant(id, 'must provide ID to create an entity');
    this.id = id as any;

    const entitySelectedFields = companionDefinition.entitySelectedFields as (keyof TFields)[];
    this.rawFields = pick(databaseFields, entitySelectedFields);
  }

  toString(): string {
    return `${this.constructor.name}[${this.getID()}]`;
  }

  equals(otherEntity: this): boolean {
    return this.toString() === otherEntity.toString();
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
  getID(): TID {
    return this.id;
  }

  /**
   * @returns {@link EntityAssociationLoader} for this entity
   */
  associationLoader(): EntityAssociationLoader<
    TFields,
    TID,
    TViewerContext,
    this,
    TSelectedFields
  > {
    return new EntityAssociationLoader(this);
  }

  /**
   * Get a underlying field from this entity's data
   * @param fieldName - the field to get
   * @returns the value of the field or undefined if not loaded with that field
   */
  getField<K extends keyof Pick<TFields, TSelectedFields>>(
    fieldName: K
  ): Pick<TFields, TSelectedFields>[K] {
    return this.rawFields[fieldName];
  }

  /**
   * @returns all underlying fields from this entity's data
   */
  getAllFields(): Readonly<Pick<TFields, TSelectedFields>> {
    return { ...this.rawFields };
  }

  /**
   * @returns all underlying fields from this entity's database data
   */
  getAllDatabaseFields(): Readonly<TFields> {
    return { ...this.databaseFields };
  }

  /**
   * Get the regular (non-transactional) query context for this entity.
   * @param viewerContext - viewer context of calling user
   */
  static getQueryContext<
    TMFields,
    TMID,
    TMViewerContext extends ViewerContext,
    TMViewerContext2 extends TMViewerContext,
    TMEntity extends ReadonlyEntity<TMFields, TMID, TMViewerContext, TMSelectedFields>,
    TMPrivacyPolicy extends EntityPrivacyPolicy<
      TMFields,
      TMID,
      TMViewerContext,
      TMEntity,
      TMSelectedFields
    >,
    TMSelectedFields extends keyof TMFields = keyof TMFields
  >(
    this: IEntityClass<
      TMFields,
      TMID,
      TMViewerContext,
      TMEntity,
      TMPrivacyPolicy,
      TMSelectedFields
    >,
    viewerContext: TMViewerContext2
  ): EntityQueryContext {
    return viewerContext
      .getViewerScopedEntityCompanionForClass(this)
      .getQueryContextProvider()
      .getQueryContext();
  }

  /**
   * Start a transaction and execute the provided transaction-scoped closure within the transaction.
   * @param viewerContext - viewer context of calling user
   * @param transactionScope - async callback to execute within the transaction
   */
  static async runInTransactionAsync<
    TResult,
    TMFields,
    TMID,
    TMViewerContext extends ViewerContext,
    TMViewerContext2 extends TMViewerContext,
    TMEntity extends ReadonlyEntity<TMFields, TMID, TMViewerContext, TMSelectedFields>,
    TMPrivacyPolicy extends EntityPrivacyPolicy<
      TMFields,
      TMID,
      TMViewerContext,
      TMEntity,
      TMSelectedFields
    >,
    TMSelectedFields extends keyof TMFields = keyof TMFields
  >(
    this: IEntityClass<
      TMFields,
      TMID,
      TMViewerContext,
      TMEntity,
      TMPrivacyPolicy,
      TMSelectedFields
    >,
    viewerContext: TMViewerContext2,
    transactionScope: (queryContext: EntityQueryContext) => Promise<TResult>
  ): Promise<TResult> {
    return await viewerContext
      .getViewerScopedEntityCompanionForClass(this)
      .getQueryContextProvider()
      .getQueryContext()
      .runInTransactionIfNotInTransactionAsync(transactionScope);
  }

  /**
   * Vend loader for loading an entity in a given query context.
   * @param viewerContext - viewer context of loading user
   * @param queryContext - query context in which to perform the load
   */
  static loader<
    TMFields,
    TMID,
    TMViewerContext extends ViewerContext,
    TMViewerContext2 extends TMViewerContext,
    TMEntity extends ReadonlyEntity<TMFields, TMID, TMViewerContext, TMSelectedFields>,
    TMPrivacyPolicy extends EntityPrivacyPolicy<
      TMFields,
      TMID,
      TMViewerContext,
      TMEntity,
      TMSelectedFields
    >,
    TMSelectedFields extends keyof TMFields = keyof TMFields
  >(
    this: IEntityClass<
      TMFields,
      TMID,
      TMViewerContext,
      TMEntity,
      TMPrivacyPolicy,
      TMSelectedFields
    >,
    viewerContext: TMViewerContext2,
    queryContext: EntityQueryContext = viewerContext
      .getViewerScopedEntityCompanionForClass(this)
      .getQueryContextProvider()
      .getQueryContext()
  ): EntityLoader<TMFields, TMID, TMViewerContext, TMEntity, TMPrivacyPolicy, TMSelectedFields> {
    return viewerContext
      .getViewerScopedEntityCompanionForClass(this)
      .getLoaderFactory()
      .forLoad(queryContext);
  }
}

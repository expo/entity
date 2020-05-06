import invariant from 'invariant';

import { IEntityClass } from './Entity';
import EntityAssociationLoader from './EntityAssociationLoader';
import EntityLoader from './EntityLoader';
import EntityPrivacyPolicy from './EntityPrivacyPolicy';
import { EntityQueryContext, EntityTransactionalQueryContext } from './EntityQueryContext';
import ViewerContext from './ViewerContext';

/**
 * A readonly entity exposes only the read functionality of an Entity. This is useful for
 * things like:
 * - Entities representing SQL views.
 * - Entities representing immutable tables.
 */
export default abstract class ReadonlyEntity<TFields, TID, TViewerContext extends ViewerContext> {
  private readonly id: TID;

  /**
   * Constructs an instance of an Entity.
   * @param viewerContext the ViewerContext reading this entity
   * @param rawFields all underlying fields for this entity's data
   * @hideconstructor
   */
  constructor(
    private readonly viewerContext: TViewerContext,
    private readonly rawFields: Readonly<TFields>
  ) {
    const idField = (this.constructor as any).getCompanionDefinition().entityConfiguration
      .idField as keyof TFields;
    const id = rawFields[idField];
    invariant(id, 'must provide ID to create an entity');
    this.id = id as any;
  }

  toString(): string {
    return `${this.constructor.name}[${this.getID()}]`;
  }

  /**
   * @return the ViewerContext authorized to read this entity
   */
  getViewerContext(): TViewerContext {
    return this.viewerContext;
  }

  /**
   * @return the ID of this entity
   */
  getID(): TID {
    return this.id;
  }

  /**
   * @return {@link EntityAssociationLoader} for this entity
   */
  associationLoader(): EntityAssociationLoader<TFields, TID, TViewerContext, this> {
    return new EntityAssociationLoader(this);
  }

  /**
   * Get a underlying field from this entity's data
   * @param fieldName the field to get
   * @return the value of the field or undefined if not loaded with that field
   */
  getField<K extends keyof TFields>(fieldName: K): TFields[K] {
    return this.rawFields[fieldName];
  }

  /**
   * @return all underlying fields from this entity's data
   */
  getAllFields(): Readonly<TFields> {
    return { ...this.rawFields };
  }

  /**
   * Start a transaction and execute the provided transaction-scoped closure within the transaction.
   * @param viewerContext viewer context of calling user
   * @param transactionScope async callback to execute within the transaction
   */
  static async runInTransactionAsync<
    TResult,
    TMFields,
    TMID,
    TMViewerContext extends ViewerContext,
    TMViewerContext2 extends TMViewerContext,
    TMEntity extends ReadonlyEntity<TMFields, TMID, TMViewerContext>,
    TMPrivacyPolicy extends EntityPrivacyPolicy<TMFields, TMID, TMViewerContext, TMEntity>
  >(
    this: IEntityClass<TMFields, TMID, TMViewerContext, TMEntity, TMPrivacyPolicy>,
    viewerContext: TMViewerContext2,
    transactionScope: (queryContext: EntityTransactionalQueryContext) => Promise<TResult>
  ): Promise<TResult> {
    return await viewerContext
      .getViewerScopedEntityCompanionForClass(this)
      .getQueryContextProvider()
      .runInTransactionAsync(transactionScope);
  }

  /**
   * Vend loader for loading an entity in a given query context.
   * @param viewerContext viewer context of loading user
   * @param queryContext query context in which to perform the load
   */
  static loader<
    TMFields,
    TMID,
    TMViewerContext extends ViewerContext,
    TMViewerContext2 extends TMViewerContext,
    TMEntity extends ReadonlyEntity<TMFields, TMID, TMViewerContext>,
    TMPrivacyPolicy extends EntityPrivacyPolicy<TMFields, TMID, TMViewerContext, TMEntity>
  >(
    this: IEntityClass<TMFields, TMID, TMViewerContext, TMEntity, TMPrivacyPolicy>,
    viewerContext: TMViewerContext2,
    queryContext: EntityQueryContext = viewerContext
      .getViewerScopedEntityCompanionForClass(this)
      .getQueryContextProvider()
      .getRegularEntityQueryContext()
  ): EntityLoader<TMFields, TMID, TMViewerContext, TMEntity, TMPrivacyPolicy> {
    return viewerContext
      .getViewerScopedEntityCompanionForClass(this)
      .getLoaderFactory()
      .forLoad(queryContext);
  }
}

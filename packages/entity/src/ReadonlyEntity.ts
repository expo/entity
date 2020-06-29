import invariant from 'invariant';
import { pick } from 'lodash';

import { IEntityClass } from './Entity';
import EntityAssociationLoader from './EntityAssociationLoader';
import EntityLoader from './EntityLoader';
import EntityPrivacyPolicy from './EntityPrivacyPolicy';
import { EntityQueryContext, EntityTransactionalQueryContext } from './EntityQueryContext';
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
  TDatabaseFields extends TFields = TFields
> {
  private readonly id: TID;
  private readonly rawFields: Readonly<TFields>;

  /**
   * Constructs an instance of an Entity.
   * @param viewerContext - the ViewerContext reading this entity
   * @param rawFields - all underlying fields for this entity's data
   *
   * @internal
   */
  constructor(
    private readonly viewerContext: TViewerContext,
    private readonly databaseFields: Readonly<TDatabaseFields>
  ) {
    const idField = (this.constructor as any).getCompanionDefinition().entityConfiguration
      .idField as keyof TFields;
    const id = databaseFields[idField];
    invariant(id, 'must provide ID to create an entity');
    this.id = id as any;

    const entitySelectedFields = (this.constructor as any).getCompanionDefinition()
      .entitySelectedFields as (keyof TFields)[];
    this.rawFields = pick(databaseFields, entitySelectedFields);
  }

  toString(): string {
    return `${this.constructor.name}[${this.getID()}]`;
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
    TDatabaseFields
  > {
    return new EntityAssociationLoader(this);
  }

  /**
   * Get a underlying field from this entity's data
   * @param fieldName - the field to get
   * @returns the value of the field or undefined if not loaded with that field
   */
  getField<K extends keyof TFields>(fieldName: K): TFields[K] {
    return this.rawFields[fieldName];
  }

  /**
   * @returns all underlying fields from this entity's data
   */
  getAllFields(): Readonly<TFields> {
    return { ...this.rawFields };
  }

  /**
   * @returns all underlying fields from this entity's database data
   */
  getAllDatabaseFields(): Readonly<TDatabaseFields> {
    return { ...this.databaseFields };
  }

  /**
   * Get the regular (non-transactional) query context for this entity.
   * @param viewerContext - viewer context of calling user
   */
  static getRegularEntityQueryContext<
    TMFields,
    TMID,
    TMViewerContext extends ViewerContext,
    TMViewerContext2 extends TMViewerContext,
    TMEntity extends ReadonlyEntity<TMFields, TMID, TMViewerContext, TMDatabaseFields>,
    TMPrivacyPolicy extends EntityPrivacyPolicy<
      TMFields,
      TMID,
      TMViewerContext,
      TMEntity,
      TMDatabaseFields
    >,
    TMDatabaseFields extends TMFields = TMFields
  >(
    this: IEntityClass<
      TMFields,
      TMID,
      TMViewerContext,
      TMEntity,
      TMPrivacyPolicy,
      TMDatabaseFields
    >,
    viewerContext: TMViewerContext2
  ): EntityQueryContext {
    return viewerContext
      .getViewerScopedEntityCompanionForClass(this)
      .getQueryContextProvider()
      .getRegularEntityQueryContext();
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
    TMEntity extends ReadonlyEntity<TMFields, TMID, TMViewerContext, TMDatabaseFields>,
    TMPrivacyPolicy extends EntityPrivacyPolicy<
      TMFields,
      TMID,
      TMViewerContext,
      TMEntity,
      TMDatabaseFields
    >,
    TMDatabaseFields extends TMFields = TMFields
  >(
    this: IEntityClass<
      TMFields,
      TMID,
      TMViewerContext,
      TMEntity,
      TMPrivacyPolicy,
      TMDatabaseFields
    >,
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
   * @param viewerContext - viewer context of loading user
   * @param queryContext - query context in which to perform the load
   */
  static loader<
    TMFields,
    TMID,
    TMViewerContext extends ViewerContext,
    TMViewerContext2 extends TMViewerContext,
    TMEntity extends ReadonlyEntity<TMFields, TMID, TMViewerContext, TMDatabaseFields>,
    TMPrivacyPolicy extends EntityPrivacyPolicy<
      TMFields,
      TMID,
      TMViewerContext,
      TMEntity,
      TMDatabaseFields
    >,
    TMDatabaseFields extends TMFields = TMFields
  >(
    this: IEntityClass<
      TMFields,
      TMID,
      TMViewerContext,
      TMEntity,
      TMPrivacyPolicy,
      TMDatabaseFields
    >,
    viewerContext: TMViewerContext2,
    queryContext: EntityQueryContext = viewerContext
      .getViewerScopedEntityCompanionForClass(this)
      .getQueryContextProvider()
      .getRegularEntityQueryContext()
  ): EntityLoader<TMFields, TMID, TMViewerContext, TMEntity, TMPrivacyPolicy, TMDatabaseFields> {
    return viewerContext
      .getViewerScopedEntityCompanionForClass(this)
      .getLoaderFactory()
      .forLoad(queryContext);
  }
}

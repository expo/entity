import { enforceAsyncResult } from '@expo/results';

import AuthorizationResultBasedEntityAssociationLoader, {
  EntityLoadThroughDirective,
} from './AuthorizationResultBasedEntityAssociationLoader';
import { IEntityClass } from './Entity';
import EntityPrivacyPolicy from './EntityPrivacyPolicy';
import { EntityQueryContext } from './EntityQueryContext';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerContext from './ViewerContext';
import { enforceResultsAsync } from './entityUtils';

/**
 * An association loader is a set of convenience methods for loading entities
 * associated with an entity. In relational databases, these entities are often referenced
 * by foreign keys.
 */
export default class EnforcingEntityAssociationLoader<
  TFields extends object,
  TID extends NonNullable<TFields[TSelectedFields]>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields,
> {
  constructor(
    private readonly authorizationResultBasedEntityAssociationLoader: AuthorizationResultBasedEntityAssociationLoader<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
  ) {}

  /**
   * Load an associated entity identified by a field value of this entity. In a relational database,
   * the field in this entity is a foreign key to the ID of the associated entity.
   * @param fieldIdentifyingAssociatedEntity - field of this entity containing the ID of the associated entity
   * @param associatedEntityClass - class of the associated entity
   * @param queryContext - query context in which to perform the load
   */
  async loadAssociatedEntityAsync<
    TIdentifyingField extends keyof Pick<TFields, TSelectedFields>,
    TAssociatedFields extends object,
    TAssociatedID extends NonNullable<TAssociatedFields[TAssociatedSelectedFields]>,
    TAssociatedEntity extends ReadonlyEntity<
      TAssociatedFields,
      TAssociatedID,
      TViewerContext,
      TAssociatedSelectedFields
    >,
    TAssociatedPrivacyPolicy extends EntityPrivacyPolicy<
      TAssociatedFields,
      TAssociatedID,
      TViewerContext,
      TAssociatedEntity,
      TAssociatedSelectedFields
    >,
    TAssociatedSelectedFields extends keyof TAssociatedFields = keyof TAssociatedFields,
  >(
    fieldIdentifyingAssociatedEntity: TIdentifyingField,
    associatedEntityClass: IEntityClass<
      TAssociatedFields,
      TAssociatedID,
      TViewerContext,
      TAssociatedEntity,
      TAssociatedPrivacyPolicy,
      TAssociatedSelectedFields
    >,
    queryContext?: EntityQueryContext,
  ): Promise<
    null extends TFields[TIdentifyingField] ? TAssociatedEntity | null : TAssociatedEntity
  > {
    return await enforceAsyncResult(
      this.authorizationResultBasedEntityAssociationLoader.loadAssociatedEntityAsync(
        fieldIdentifyingAssociatedEntity,
        associatedEntityClass,
        queryContext,
      ),
    );
  }

  /**
   * Load many entities associated with this entity, often referred to as entites belonging
   * to this entity. In a relational database, the field in the foreign entity is a
   * foreign key to the ID of this entity. Also commonly referred to as a has many relationship,
   * where this entity has many associated entities.
   * @param associatedEntityClass - class of the associated entities
   * @param associatedEntityFieldContainingThisID - field of associated entity which contains the ID of this entity
   * @param queryContext - query context in which to perform the load
   */
  async loadManyAssociatedEntitiesAsync<
    TAssociatedFields extends object,
    TAssociatedID extends NonNullable<TAssociatedFields[TAssociatedSelectedFields]>,
    TAssociatedEntity extends ReadonlyEntity<
      TAssociatedFields,
      TAssociatedID,
      TViewerContext,
      TAssociatedSelectedFields
    >,
    TAssociatedPrivacyPolicy extends EntityPrivacyPolicy<
      TAssociatedFields,
      TAssociatedID,
      TViewerContext,
      TAssociatedEntity,
      TAssociatedSelectedFields
    >,
    TAssociatedSelectedFields extends keyof TAssociatedFields = keyof TAssociatedFields,
  >(
    associatedEntityClass: IEntityClass<
      TAssociatedFields,
      TAssociatedID,
      TViewerContext,
      TAssociatedEntity,
      TAssociatedPrivacyPolicy,
      TAssociatedSelectedFields
    >,
    associatedEntityFieldContainingThisID: keyof Pick<TAssociatedFields, TAssociatedSelectedFields>,
    queryContext?: EntityQueryContext,
  ): Promise<readonly TAssociatedEntity[]> {
    return await enforceResultsAsync(
      this.authorizationResultBasedEntityAssociationLoader.loadManyAssociatedEntitiesAsync(
        associatedEntityClass,
        associatedEntityFieldContainingThisID,
        queryContext,
      ),
    );
  }

  /**
   * Load an associated entity identified by a field value of this entity. In a relational database,
   * the field in this entity is a foreign key to a unique field of the associated entity.
   * @param fieldIdentifyingAssociatedEntity - field of this entity containing the value with which to look up associated entity
   * @param associatedEntityClass - class of the associated entity
   * @param associatedEntityLookupByField - field of associated entity with which to look up the associated entity
   * @param queryContext - query context in which to perform the load
   */
  async loadAssociatedEntityByFieldEqualingAsync<
    TAssociatedFields extends object,
    TAssociatedID extends NonNullable<TAssociatedFields[TAssociatedSelectedFields]>,
    TAssociatedEntity extends ReadonlyEntity<
      TAssociatedFields,
      TAssociatedID,
      TViewerContext,
      TAssociatedSelectedFields
    >,
    TAssociatedPrivacyPolicy extends EntityPrivacyPolicy<
      TAssociatedFields,
      TAssociatedID,
      TViewerContext,
      TAssociatedEntity,
      TAssociatedSelectedFields
    >,
    TAssociatedSelectedFields extends keyof TAssociatedFields = keyof TAssociatedFields,
  >(
    fieldIdentifyingAssociatedEntity: keyof Pick<TFields, TSelectedFields>,
    associatedEntityClass: IEntityClass<
      TAssociatedFields,
      TAssociatedID,
      TViewerContext,
      TAssociatedEntity,
      TAssociatedPrivacyPolicy,
      TAssociatedSelectedFields
    >,
    associatedEntityLookupByField: keyof Pick<TAssociatedFields, TAssociatedSelectedFields>,
    queryContext?: EntityQueryContext,
  ): Promise<TAssociatedEntity | null> {
    const result =
      await this.authorizationResultBasedEntityAssociationLoader.loadAssociatedEntityByFieldEqualingAsync(
        fieldIdentifyingAssociatedEntity,
        associatedEntityClass,
        associatedEntityLookupByField,
        queryContext,
      );
    return result?.enforceValue() ?? null;
  }

  /**
   * Load many associated entities identified by a field value of this entity. In a relational database,
   * the field in this entity refers to a field of the associated entity.
   * @param fieldIdentifyingAssociatedEntity - field of this entity containing the value with which to look up associated entities
   * @param associatedEntityClass - class of the associated entities
   * @param associatedEntityLookupByField - field of associated entities with which to look up the associated entities
   * @param queryContext - query context in which to perform the load
   */
  async loadManyAssociatedEntitiesByFieldEqualingAsync<
    TAssociatedFields extends object,
    TAssociatedID extends NonNullable<TAssociatedFields[TAssociatedSelectedFields]>,
    TAssociatedEntity extends ReadonlyEntity<
      TAssociatedFields,
      TAssociatedID,
      TViewerContext,
      TAssociatedSelectedFields
    >,
    TAssociatedPrivacyPolicy extends EntityPrivacyPolicy<
      TAssociatedFields,
      TAssociatedID,
      TViewerContext,
      TAssociatedEntity,
      TAssociatedSelectedFields
    >,
    TAssociatedSelectedFields extends keyof TAssociatedFields = keyof TAssociatedFields,
  >(
    fieldIdentifyingAssociatedEntity: keyof Pick<TFields, TSelectedFields>,
    associatedEntityClass: IEntityClass<
      TAssociatedFields,
      TAssociatedID,
      TViewerContext,
      TAssociatedEntity,
      TAssociatedPrivacyPolicy,
      TAssociatedSelectedFields
    >,
    associatedEntityLookupByField: keyof Pick<TAssociatedFields, TAssociatedSelectedFields>,
    queryContext?: EntityQueryContext,
  ): Promise<readonly TAssociatedEntity[]> {
    return await enforceResultsAsync(
      this.authorizationResultBasedEntityAssociationLoader.loadManyAssociatedEntitiesByFieldEqualingAsync(
        fieldIdentifyingAssociatedEntity,
        associatedEntityClass,
        associatedEntityLookupByField,
        queryContext,
      ),
    );
  }

  /**
   * Load an associated entity by folding a sequence of EntityLoadThroughDirective. At each
   * fold step, load an associated entity identified by a field value of the current fold value.
   * @param loadDirectives - associated entity load directives instructing each step of the fold
   * @param queryContext - query context in which to perform the loads
   */
  async loadAssociatedEntityThroughAsync<
    TFields2 extends object,
    TID2 extends NonNullable<TFields2[TSelectedFields2]>,
    TEntity2 extends ReadonlyEntity<TFields2, TID2, TViewerContext, TSelectedFields2>,
    TPrivacyPolicy2 extends EntityPrivacyPolicy<
      TFields2,
      TID2,
      TViewerContext,
      TEntity2,
      TSelectedFields2
    >,
    TSelectedFields2 extends keyof TFields2 = keyof TFields2,
  >(
    loadDirectives: [
      EntityLoadThroughDirective<
        TViewerContext,
        TFields,
        TFields2,
        TID2,
        TEntity2,
        TPrivacyPolicy2,
        TSelectedFields,
        TSelectedFields2
      >,
    ],
    queryContext?: EntityQueryContext,
  ): Promise<TEntity2 | null>;

  /**
   * Load an associated entity by folding a sequence of EntityLoadThroughDirective. At each
   * fold step, load an associated entity identified by a field value of the current fold value.
   * @param loadDirectives - associated entity load directives instructing each step of the fold
   * @param queryContext - query context in which to perform the loads
   */
  async loadAssociatedEntityThroughAsync<
    TFields2 extends object,
    TID2 extends NonNullable<TFields2[TSelectedFields2]>,
    TEntity2 extends ReadonlyEntity<TFields2, TID2, TViewerContext, TSelectedFields2>,
    TPrivacyPolicy2 extends EntityPrivacyPolicy<
      TFields2,
      TID2,
      TViewerContext,
      TEntity2,
      TSelectedFields2
    >,
    TFields3 extends object,
    TID3 extends NonNullable<TFields3[TSelectedFields3]>,
    TEntity3 extends ReadonlyEntity<TFields3, TID3, TViewerContext, TSelectedFields3>,
    TPrivacyPolicy3 extends EntityPrivacyPolicy<
      TFields3,
      TID3,
      TViewerContext,
      TEntity3,
      TSelectedFields3
    >,
    TSelectedFields2 extends keyof TFields2 = keyof TFields2,
    TSelectedFields3 extends keyof TFields3 = keyof TFields3,
  >(
    loadDirectives: [
      EntityLoadThroughDirective<
        TViewerContext,
        TFields,
        TFields2,
        TID2,
        TEntity2,
        TPrivacyPolicy2,
        TSelectedFields,
        TSelectedFields2
      >,
      EntityLoadThroughDirective<
        TViewerContext,
        TFields2,
        TFields3,
        TID3,
        TEntity3,
        TPrivacyPolicy3,
        TSelectedFields2,
        TSelectedFields3
      >,
    ],
    queryContext?: EntityQueryContext,
  ): Promise<TEntity3 | null>;

  /**
   * Load an associated entity by folding a sequence of EntityLoadThroughDirective. At each
   * fold step, load an associated entity identified by a field value of the current fold value.
   * @param loadDirectives - associated entity load directives instructing each step of the fold
   * @param queryContext - query context in which to perform the loads
   */
  async loadAssociatedEntityThroughAsync<
    TFields2 extends object,
    TID2 extends NonNullable<TFields2[TSelectedFields2]>,
    TEntity2 extends ReadonlyEntity<TFields2, TID2, TViewerContext, TSelectedFields2>,
    TPrivacyPolicy2 extends EntityPrivacyPolicy<
      TFields2,
      TID2,
      TViewerContext,
      TEntity2,
      TSelectedFields2
    >,
    TFields3 extends object,
    TID3 extends NonNullable<TFields3[TSelectedFields3]>,
    TEntity3 extends ReadonlyEntity<TFields3, TID3, TViewerContext, TSelectedFields3>,
    TPrivacyPolicy3 extends EntityPrivacyPolicy<
      TFields3,
      TID3,
      TViewerContext,
      TEntity3,
      TSelectedFields3
    >,
    TFields4 extends object,
    TID4 extends NonNullable<TFields4[TSelectedFields4]>,
    TEntity4 extends ReadonlyEntity<TFields4, TID4, TViewerContext, TSelectedFields4>,
    TPrivacyPolicy4 extends EntityPrivacyPolicy<
      TFields4,
      TID4,
      TViewerContext,
      TEntity4,
      TSelectedFields4
    >,
    TSelectedFields2 extends keyof TFields2 = keyof TFields2,
    TSelectedFields3 extends keyof TFields3 = keyof TFields3,
    TSelectedFields4 extends keyof TFields4 = keyof TFields4,
  >(
    loadDirectives: [
      EntityLoadThroughDirective<
        TViewerContext,
        TFields,
        TFields2,
        TID2,
        TEntity2,
        TPrivacyPolicy2,
        TSelectedFields,
        TSelectedFields2
      >,
      EntityLoadThroughDirective<
        TViewerContext,
        TFields2,
        TFields3,
        TID3,
        TEntity3,
        TPrivacyPolicy3,
        TSelectedFields2,
        TSelectedFields3
      >,
      EntityLoadThroughDirective<
        TViewerContext,
        TFields3,
        TFields4,
        TID4,
        TEntity4,
        TPrivacyPolicy4,
        TSelectedFields3,
        TSelectedFields4
      >,
    ],
    queryContext?: EntityQueryContext,
  ): Promise<TEntity4 | null>;

  /**
   * Load an associated entity by folding a sequence of EntityLoadThroughDirective. At each
   * fold step, load an associated entity identified by a field value of the current fold value.
   * @param loadDirectives - associated entity load directives instructing each step of the fold
   * @param queryContext - query context in which to perform the loads
   */
  async loadAssociatedEntityThroughAsync(
    loadDirectives: EntityLoadThroughDirective<TViewerContext, any, any, any, any, any, any, any>[],
    queryContext?: EntityQueryContext,
  ): Promise<ReadonlyEntity<any, any, any, any> | null>;

  async loadAssociatedEntityThroughAsync(
    loadDirectives: EntityLoadThroughDirective<TViewerContext, any, any, any, any, any, any, any>[],
    queryContext?: EntityQueryContext,
  ): Promise<ReadonlyEntity<any, any, any, any> | null> {
    const result =
      await this.authorizationResultBasedEntityAssociationLoader.loadAssociatedEntityThroughAsync(
        loadDirectives,
        queryContext,
      );
    return result?.enforceValue() ?? null;
  }
}

import { Result, result } from '@expo/results';

import { IEntityClass } from './Entity';
import EntityPrivacyPolicy from './EntityPrivacyPolicy';
import { EntityQueryContext } from './EntityQueryContext';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerContext from './ViewerContext';

export default class EntityAssociationLoader<
  TFields,
  TID,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext>
> {
  constructor(private readonly entity: TEntity) {}

  /**
   * Load an associated entity identified by a field value of this entity. In a relational database,
   * the field in this entity is a foreign key to the ID of the associated entity.
   * @param fieldIdentifyingAssociatedEntity field of this entity containing the ID of the associated entity
   * @param associatedEntityClass class of the associated entity
   * @param queryContext query context in which to perform the load
   */
  async loadAssociatedEntityAsync<
    TAssociatedFields,
    TAssociatedID,
    TAssociatedEntity extends ReadonlyEntity<TAssociatedFields, TAssociatedID, TViewerContext>,
    TAssociatedPrivacyPolicy extends EntityPrivacyPolicy<
      TAssociatedFields,
      TAssociatedID,
      TViewerContext,
      TAssociatedEntity
    >
  >(
    fieldIdentifyingAssociatedEntity: keyof TFields,
    associatedEntityClass: IEntityClass<
      TAssociatedFields,
      TAssociatedID,
      TViewerContext,
      TAssociatedEntity,
      TAssociatedPrivacyPolicy
    >,
    queryContext: EntityQueryContext = this.entity
      .getViewerContext()
      .getViewerScopedEntityCompanionForClass(associatedEntityClass)
      .getQueryContextProvider()
      .getRegularEntityQueryContext()
  ): Promise<Result<TAssociatedEntity>> {
    const associatedEntityID = this.entity.getField(fieldIdentifyingAssociatedEntity);
    const loader = this.entity
      .getViewerContext()
      .getViewerScopedEntityCompanionForClass(associatedEntityClass)
      .getLoaderFactory()
      .forLoad(queryContext);
    return await loader.loadByIDAsync((associatedEntityID as unknown) as TAssociatedID);
  }

  /**
   * Load an associated entity identified by a field value of this entity. In a relational database,
   * the field in this entity is a foreign key to a unique field of the associated entity.
   * @param fieldIdentifyingAssociatedEntity field of this entity containing the value with which to look up associated entity
   * @param associatedEntityClass class of the associated entity
   * @param associatedEntityLookupByField field of associated entity with which to look up the associated entity
   * @param queryContext query context in which to perform the load
   */
  async loadAssociatedEntityByFieldEqualingAsync<
    TAssociatedFields,
    TAssociatedID,
    TAssociatedEntity extends ReadonlyEntity<TAssociatedFields, TAssociatedID, TViewerContext>,
    TAssociatedPrivacyPolicy extends EntityPrivacyPolicy<
      TAssociatedFields,
      TAssociatedID,
      TViewerContext,
      TAssociatedEntity
    >
  >(
    fieldIdentifyingAssociatedEntity: keyof TFields,
    associatedEntityClass: IEntityClass<
      TAssociatedFields,
      TAssociatedID,
      TViewerContext,
      TAssociatedEntity,
      TAssociatedPrivacyPolicy
    >,
    associatedEntityLookupByField: keyof TAssociatedFields,
    queryContext: EntityQueryContext = this.entity
      .getViewerContext()
      .getViewerScopedEntityCompanionForClass(associatedEntityClass)
      .getQueryContextProvider()
      .getRegularEntityQueryContext()
  ): Promise<Result<TAssociatedEntity> | null> {
    const associatedFieldValue = this.entity.getField(fieldIdentifyingAssociatedEntity);
    const loader = this.entity
      .getViewerContext()
      .getViewerScopedEntityCompanionForClass(associatedEntityClass)
      .getLoaderFactory()
      .forLoad(queryContext);
    return await loader.loadByFieldEqualingAsync(
      associatedEntityLookupByField,
      associatedFieldValue as any
    );
  }

  /**
   * Load an associated entity by folding a sequence of {@link EntityLoadThroughDirective}. At each
   * fold step, load an associated entity identified by a field value of the current fold value.
   * @param loadDirectives associated entity load directives instructing each step of the fold
   * @param queryContext query context in which to perform the loads
   */
  async loadAssociatedEntityThroughAsync<
    TEntityRoot extends ReadonlyEntity<TFields, TID, TViewerContext>,
    TPrivacyPolicyRoot extends EntityPrivacyPolicy<TFields, TID, TViewerContext, TEntityRoot>,
    TFields2,
    TID2,
    TEntity2 extends ReadonlyEntity<TFields2, TID2, TViewerContext>,
    TPrivacyPolicy2 extends EntityPrivacyPolicy<TFields2, TID2, TViewerContext, TEntity2>
  >(
    loadDirectives: [
      EntityLoadThroughDirective<TViewerContext, TFields, TFields2, TID2, TEntity2, TPrivacyPolicy2>
    ],
    queryContext?: EntityQueryContext
  ): Promise<Result<TEntity2> | null>;

  /**
   * Load an associated entity by folding a sequence of {@link EntityLoadThroughDirective}. At each
   * fold step, load an associated entity identified by a field value of the current fold value.
   * @param loadDirectives associated entity load directives instructing each step of the fold
   * @param queryContext query context in which to perform the loads
   */
  async loadAssociatedEntityThroughAsync<
    TEntityRoot extends ReadonlyEntity<TFields, TID, TViewerContext>,
    TPrivacyPolicyRoot extends EntityPrivacyPolicy<TFields, TID, TViewerContext, TEntityRoot>,
    TFields2,
    TID2,
    TEntity2 extends ReadonlyEntity<TFields2, TID2, TViewerContext>,
    TPrivacyPolicy2 extends EntityPrivacyPolicy<TFields2, TID2, TViewerContext, TEntity2>,
    TFields3,
    TID3,
    TEntity3 extends ReadonlyEntity<TFields3, TID3, TViewerContext>,
    TPrivacyPolicy3 extends EntityPrivacyPolicy<TFields3, TID3, TViewerContext, TEntity3>
  >(
    loadDirectives: [
      EntityLoadThroughDirective<
        TViewerContext,
        TFields,
        TFields2,
        TID2,
        TEntity2,
        TPrivacyPolicy2
      >,
      EntityLoadThroughDirective<
        TViewerContext,
        TFields2,
        TFields3,
        TID3,
        TEntity3,
        TPrivacyPolicy3
      >
    ],
    queryContext?: EntityQueryContext
  ): Promise<Result<TEntity3> | null>;

  /**
   * Load an associated entity by folding a sequence of {@link EntityLoadThroughDirective}. At each
   * fold step, load an associated entity identified by a field value of the current fold value.
   * @param loadDirectives associated entity load directives instructing each step of the fold
   * @param queryContext query context in which to perform the loads
   */
  async loadAssociatedEntityThroughAsync<
    TEntityRoot extends ReadonlyEntity<TFields, TID, TViewerContext>,
    TPrivacyPolicyRoot extends EntityPrivacyPolicy<TFields, TID, TViewerContext, TEntityRoot>,
    TFields2,
    TID2,
    TEntity2 extends ReadonlyEntity<TFields2, TID2, TViewerContext>,
    TPrivacyPolicy2 extends EntityPrivacyPolicy<TFields2, TID2, TViewerContext, TEntity2>,
    TFields3,
    TID3,
    TEntity3 extends ReadonlyEntity<TFields3, TID3, TViewerContext>,
    TPrivacyPolicy3 extends EntityPrivacyPolicy<TFields3, TID3, TViewerContext, TEntity3>,
    TFields4,
    TID4,
    TEntity4 extends ReadonlyEntity<TFields4, TID4, TViewerContext>,
    TPrivacyPolicy4 extends EntityPrivacyPolicy<TFields4, TID4, TViewerContext, TEntity4>
  >(
    loadDirective: [
      EntityLoadThroughDirective<
        TViewerContext,
        TFields,
        TFields2,
        TID2,
        TEntity2,
        TPrivacyPolicy2
      >,
      EntityLoadThroughDirective<
        TViewerContext,
        TFields2,
        TFields3,
        TID3,
        TEntity3,
        TPrivacyPolicy3
      >,
      EntityLoadThroughDirective<
        TViewerContext,
        TFields3,
        TFields4,
        TID4,
        TEntity4,
        TPrivacyPolicy4
      >
    ],
    queryContext?: EntityQueryContext
  ): Promise<Result<TEntity4> | null>;

  /**
   * Load an associated entity by folding a sequence of {@link EntityLoadThroughDirective}. At each
   * fold step, load an associated entity identified by a field value of the current fold value.
   * @param loadDirectives associated entity load directives instructing each step of the fold
   * @param queryContext query context in which to perform the loads
   */
  async loadAssociatedEntityThroughAsync(
    loadDirectives: EntityLoadThroughDirective<TViewerContext, any, any, any, any, any>[],
    queryContext?: EntityQueryContext
  ): Promise<Result<ReadonlyEntity<any, any, any>> | null>;

  async loadAssociatedEntityThroughAsync(
    loadDirectives: EntityLoadThroughDirective<TViewerContext, any, any, any, any, any>[],
    queryContext?: EntityQueryContext
  ): Promise<Result<ReadonlyEntity<any, any, any>> | null> {
    let currentEntity: ReadonlyEntity<any, any, any> = this.entity;
    for (const loadDirective of loadDirectives) {
      const {
        associatedEntityClass,
        fieldIdentifyingAssociatedEntity,
        associatedEntityLookupByField,
      } = loadDirective;
      let associatedEntityResult: Result<ReadonlyEntity<any, any, any>> | null;
      if (associatedEntityLookupByField) {
        associatedEntityResult = await currentEntity
          .associationLoader()
          .loadAssociatedEntityByFieldEqualingAsync(
            fieldIdentifyingAssociatedEntity,
            associatedEntityClass,
            associatedEntityLookupByField,
            queryContext
          );
      } else {
        associatedEntityResult = await currentEntity
          .associationLoader()
          .loadAssociatedEntityAsync(
            fieldIdentifyingAssociatedEntity,
            associatedEntityClass,
            queryContext
          );
      }

      if (!associatedEntityResult) {
        return null;
      }

      if (!associatedEntityResult.ok) {
        return result(associatedEntityResult.reason);
      }
      currentEntity = associatedEntityResult.value;
    }
    return result(currentEntity);
  }
}

/**
 * Instruction for each step of a load-associated-through method.
 */
export interface EntityLoadThroughDirective<
  TViewerContext extends ViewerContext,
  TFields,
  TAssociatedFields,
  TAssociatedID,
  TAssociatedEntity extends ReadonlyEntity<TAssociatedFields, TAssociatedID, TViewerContext>,
  TAssociatedPrivacyPolicy extends EntityPrivacyPolicy<
    TAssociatedFields,
    TAssociatedID,
    TViewerContext,
    TAssociatedEntity
  >
> {
  /**
   * Class of entity to load at this step.
   */
  associatedEntityClass: IEntityClass<
    TAssociatedFields,
    TAssociatedID,
    TViewerContext,
    TAssociatedEntity,
    TAssociatedPrivacyPolicy
  >;

  /**
   * Field of the current entity with which to load an instance of associatedEntityClass.
   */
  fieldIdentifyingAssociatedEntity: keyof TFields;

  /**
   * Field by which to load the instance of associatedEntityClass. If not provided, the
   * associatedEntityClass instance is fetched by its ID.
   */
  associatedEntityLookupByField?: keyof TAssociatedFields;
}

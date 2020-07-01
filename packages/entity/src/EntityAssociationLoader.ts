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
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields
> {
  constructor(private readonly entity: TEntity) {}

  /**
   * Load an associated entity identified by a field value of this entity. In a relational database,
   * the field in this entity is a foreign key to the ID of the associated entity.
   * @param fieldIdentifyingAssociatedEntity - field of this entity containing the ID of the associated entity
   * @param associatedEntityClass - class of the associated entity
   * @param queryContext - query context in which to perform the load
   */
  async loadAssociatedEntityAsync<
    TAssociatedFields,
    TAssociatedID,
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
    TAssociatedSelectedFields extends keyof TAssociatedFields = keyof TAssociatedFields
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
   * Load many entities associated with this entity, often referred to as entites belonging
   * to this entity. In a relational database, the field in the foreign entity is a
   * foreign key to the ID of this entity. Also commonly referred to as a has many relationship,
   * where this entity has many associated entities.
   * @param associatedEntityClass - class of the associated entities
   * @param associatedEntityFieldContainingThisID - field of associated entity which contains the ID of this entity
   * @param queryContext - query context in which to perform the load
   */
  async loadManyAssociatedEntitiesAsync<
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
    associatedEntityClass: IEntityClass<
      TAssociatedFields,
      TAssociatedID,
      TViewerContext,
      TAssociatedEntity,
      TAssociatedPrivacyPolicy
    >,
    associatedEntityFieldContainingThisID: keyof TAssociatedFields,
    queryContext: EntityQueryContext = this.entity
      .getViewerContext()
      .getViewerScopedEntityCompanionForClass(associatedEntityClass)
      .getQueryContextProvider()
      .getRegularEntityQueryContext()
  ): Promise<readonly Result<TAssociatedEntity>[]> {
    const thisID = this.entity.getID();
    const loader = this.entity
      .getViewerContext()
      .getViewerScopedEntityCompanionForClass(associatedEntityClass)
      .getLoaderFactory()
      .forLoad(queryContext);
    return await loader.loadManyByFieldEqualingAsync(
      associatedEntityFieldContainingThisID,
      thisID as any
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
    TAssociatedFields,
    TAssociatedID,
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
    TAssociatedSelectedFields extends keyof TAssociatedFields = keyof TAssociatedFields
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
   * Load many associated entities identified by a field value of this entity. In a relational database,
   * the field in this entity refers to a field of the associated entity.
   * @param fieldIdentifyingAssociatedEntity - field of this entity containing the value with which to look up associated entities
   * @param associatedEntityClass - class of the associated entities
   * @param associatedEntityLookupByField - field of associated entities with which to look up the associated entities
   * @param queryContext - query context in which to perform the load
   */
  async loadManyAssociatedEntitiesByFieldEqualingAsync<
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
    fieldIdentifyingAssociatedEntity: keyof Pick<TFields, TSelectedFields>,
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
  ): Promise<readonly Result<TAssociatedEntity>[]> {
    const associatedFieldValue = this.entity.getField(fieldIdentifyingAssociatedEntity);
    const loader = this.entity
      .getViewerContext()
      .getViewerScopedEntityCompanionForClass(associatedEntityClass)
      .getLoaderFactory()
      .forLoad(queryContext);
    return await loader.loadManyByFieldEqualingAsync(
      associatedEntityLookupByField,
      associatedFieldValue as any
    );
  }

  /**
   * Load an associated entity by folding a sequence of {@link EntityLoadThroughDirective}. At each
   * fold step, load an associated entity identified by a field value of the current fold value.
   * @param loadDirectives - associated entity load directives instructing each step of the fold
   * @param queryContext - query context in which to perform the loads
   */
  async loadAssociatedEntityThroughAsync<
    TFields2,
    TID2,
    TEntity2 extends ReadonlyEntity<TFields2, TID2, TViewerContext, TSelectedFields2>,
    TPrivacyPolicy2 extends EntityPrivacyPolicy<
      TFields2,
      TID2,
      TViewerContext,
      TEntity2,
      TSelectedFields2
    >,
    TSelectedFields2 extends keyof TFields2 = keyof TFields2
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
      >
    ],
    queryContext?: EntityQueryContext
  ): Promise<Result<TEntity2> | null>;

  /**
   * Load an associated entity by folding a sequence of {@link EntityLoadThroughDirective}. At each
   * fold step, load an associated entity identified by a field value of the current fold value.
   * @param loadDirectives - associated entity load directives instructing each step of the fold
   * @param queryContext - query context in which to perform the loads
   */
  async loadAssociatedEntityThroughAsync<
    TFields2,
    TID2,
    TEntity2 extends ReadonlyEntity<TFields2, TID2, TViewerContext, TSelectedFields2>,
    TPrivacyPolicy2 extends EntityPrivacyPolicy<
      TFields2,
      TID2,
      TViewerContext,
      TEntity2,
      TSelectedFields2
    >,
    TFields3,
    TID3,
    TEntity3 extends ReadonlyEntity<TFields3, TID3, TViewerContext, TSelectedFields3>,
    TPrivacyPolicy3 extends EntityPrivacyPolicy<
      TFields3,
      TID3,
      TViewerContext,
      TEntity3,
      TSelectedFields3
    >,
    TSelectedFields2 extends keyof TFields2 = keyof TFields2,
    TSelectedFields3 extends keyof TFields3 = keyof TFields3
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
      >
    ],
    queryContext?: EntityQueryContext
  ): Promise<Result<TEntity3> | null>;

  /**
   * Load an associated entity by folding a sequence of {@link EntityLoadThroughDirective}. At each
   * fold step, load an associated entity identified by a field value of the current fold value.
   * @param loadDirectives - associated entity load directives instructing each step of the fold
   * @param queryContext - query context in which to perform the loads
   */
  async loadAssociatedEntityThroughAsync<
    TFields2,
    TID2,
    TEntity2 extends ReadonlyEntity<TFields2, TID2, TViewerContext, TSelectedFields2>,
    TPrivacyPolicy2 extends EntityPrivacyPolicy<
      TFields2,
      TID2,
      TViewerContext,
      TEntity2,
      TSelectedFields2
    >,
    TFields3,
    TID3,
    TEntity3 extends ReadonlyEntity<TFields3, TID3, TViewerContext, TSelectedFields3>,
    TPrivacyPolicy3 extends EntityPrivacyPolicy<
      TFields3,
      TID3,
      TViewerContext,
      TEntity3,
      TSelectedFields3
    >,
    TFields4,
    TID4,
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
    TSelectedFields4 extends keyof TFields4 = keyof TFields4
  >(
    loadDirective: [
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
      >
    ],
    queryContext?: EntityQueryContext
  ): Promise<Result<TEntity4> | null>;

  /**
   * Load an associated entity by folding a sequence of {@link EntityLoadThroughDirective}. At each
   * fold step, load an associated entity identified by a field value of the current fold value.
   * @param loadDirectives - associated entity load directives instructing each step of the fold
   * @param queryContext - query context in which to perform the loads
   */
  async loadAssociatedEntityThroughAsync(
    loadDirectives: EntityLoadThroughDirective<TViewerContext, any, any, any, any, any, any>[],
    queryContext?: EntityQueryContext
  ): Promise<Result<ReadonlyEntity<any, any, any, any>> | null>;

  async loadAssociatedEntityThroughAsync(
    loadDirectives: EntityLoadThroughDirective<TViewerContext, any, any, any, any, any, any>[],
    queryContext?: EntityQueryContext
  ): Promise<Result<ReadonlyEntity<any, any, any, any>> | null> {
    let currentEntity: ReadonlyEntity<any, any, any, any> = this.entity;
    for (const loadDirective of loadDirectives) {
      const {
        associatedEntityClass,
        fieldIdentifyingAssociatedEntity,
        associatedEntityLookupByField,
      } = loadDirective;
      let associatedEntityResult: Result<ReadonlyEntity<any, any, any, any>> | null;
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
  TSelectedFields extends keyof TFields = keyof TFields,
  TAssociatedSelectedFields extends keyof TAssociatedFields = keyof TAssociatedFields
> {
  /**
   * Class of entity to load at this step.
   */
  associatedEntityClass: IEntityClass<
    TAssociatedFields,
    TAssociatedID,
    TViewerContext,
    TAssociatedEntity,
    TAssociatedPrivacyPolicy,
    TAssociatedSelectedFields
  >;

  /**
   * Field of the current entity with which to load an instance of associatedEntityClass.
   */
  fieldIdentifyingAssociatedEntity: keyof Pick<TFields, TSelectedFields>;

  /**
   * Field by which to load the instance of associatedEntityClass. If not provided, the
   * associatedEntityClass instance is fetched by its ID.
   */
  associatedEntityLookupByField?: keyof TAssociatedFields;
}

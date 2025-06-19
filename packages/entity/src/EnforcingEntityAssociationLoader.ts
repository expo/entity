import { enforceAsyncResult } from '@expo/results';

import {
  AuthorizationResultBasedEntityAssociationLoader,
  EntityLoadThroughDirective,
} from './AuthorizationResultBasedEntityAssociationLoader';
import { IEntityClass } from './Entity';
import { EntityPrivacyPolicy } from './EntityPrivacyPolicy';
import { ReadonlyEntity } from './ReadonlyEntity';
import { ViewerContext } from './ViewerContext';
import { enforceResultsAsync } from './entityUtils';

/**
 * An association loader is a set of convenience methods for loading entities
 * associated with an entity. In relational databases, these entities are often referenced
 * by foreign keys.
 */
export class EnforcingEntityAssociationLoader<
  TFields extends Record<string, any>,
  TIDField extends keyof NonNullable<Pick<TFields, TSelectedFields>>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TIDField, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields,
> {
  constructor(
    private readonly authorizationResultBasedEntityAssociationLoader: AuthorizationResultBasedEntityAssociationLoader<
      TFields,
      TIDField,
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
   */
  async loadAssociatedEntityAsync<
    TIdentifyingField extends keyof Pick<TFields, TSelectedFields>,
    TAssociatedFields extends object,
    TAssociatedIDField extends keyof NonNullable<
      Pick<TAssociatedFields, TAssociatedSelectedFields>
    >,
    TAssociatedEntity extends ReadonlyEntity<
      TAssociatedFields,
      TAssociatedIDField,
      TViewerContext,
      TAssociatedSelectedFields
    >,
    TAssociatedPrivacyPolicy extends EntityPrivacyPolicy<
      TAssociatedFields,
      TAssociatedIDField,
      TViewerContext,
      TAssociatedEntity,
      TAssociatedSelectedFields
    >,
    TAssociatedSelectedFields extends keyof TAssociatedFields = keyof TAssociatedFields,
  >(
    fieldIdentifyingAssociatedEntity: TIdentifyingField,
    associatedEntityClass: IEntityClass<
      TAssociatedFields,
      TAssociatedIDField,
      TViewerContext,
      TAssociatedEntity,
      TAssociatedPrivacyPolicy,
      TAssociatedSelectedFields
    >,
  ): Promise<
    null extends TFields[TIdentifyingField] ? TAssociatedEntity | null : TAssociatedEntity
  > {
    return await enforceAsyncResult(
      this.authorizationResultBasedEntityAssociationLoader.loadAssociatedEntityAsync(
        fieldIdentifyingAssociatedEntity,
        associatedEntityClass,
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
   */
  async loadManyAssociatedEntitiesAsync<
    TAssociatedFields extends object,
    TAssociatedIDField extends keyof NonNullable<
      Pick<TAssociatedFields, TAssociatedSelectedFields>
    >,
    TAssociatedEntity extends ReadonlyEntity<
      TAssociatedFields,
      TAssociatedIDField,
      TViewerContext,
      TAssociatedSelectedFields
    >,
    TAssociatedPrivacyPolicy extends EntityPrivacyPolicy<
      TAssociatedFields,
      TAssociatedIDField,
      TViewerContext,
      TAssociatedEntity,
      TAssociatedSelectedFields
    >,
    TAssociatedSelectedFields extends keyof TAssociatedFields = keyof TAssociatedFields,
  >(
    associatedEntityClass: IEntityClass<
      TAssociatedFields,
      TAssociatedIDField,
      TViewerContext,
      TAssociatedEntity,
      TAssociatedPrivacyPolicy,
      TAssociatedSelectedFields
    >,
    associatedEntityFieldContainingThisID: keyof Pick<TAssociatedFields, TAssociatedSelectedFields>,
  ): Promise<readonly TAssociatedEntity[]> {
    return await enforceResultsAsync(
      this.authorizationResultBasedEntityAssociationLoader.loadManyAssociatedEntitiesAsync(
        associatedEntityClass,
        associatedEntityFieldContainingThisID,
      ),
    );
  }

  /**
   * Load an associated entity identified by a field value of this entity. In a relational database,
   * the field in this entity is a foreign key to a unique field of the associated entity.
   * @param fieldIdentifyingAssociatedEntity - field of this entity containing the value with which to look up associated entity
   * @param associatedEntityClass - class of the associated entity
   * @param associatedEntityLookupByField - field of associated entity with which to look up the associated entity
   */
  async loadAssociatedEntityByFieldEqualingAsync<
    TAssociatedFields extends object,
    TAssociatedIDField extends keyof NonNullable<
      Pick<TAssociatedFields, TAssociatedSelectedFields>
    >,
    TAssociatedEntity extends ReadonlyEntity<
      TAssociatedFields,
      TAssociatedIDField,
      TViewerContext,
      TAssociatedSelectedFields
    >,
    TAssociatedPrivacyPolicy extends EntityPrivacyPolicy<
      TAssociatedFields,
      TAssociatedIDField,
      TViewerContext,
      TAssociatedEntity,
      TAssociatedSelectedFields
    >,
    TAssociatedSelectedFields extends keyof TAssociatedFields = keyof TAssociatedFields,
  >(
    fieldIdentifyingAssociatedEntity: keyof Pick<TFields, TSelectedFields>,
    associatedEntityClass: IEntityClass<
      TAssociatedFields,
      TAssociatedIDField,
      TViewerContext,
      TAssociatedEntity,
      TAssociatedPrivacyPolicy,
      TAssociatedSelectedFields
    >,
    associatedEntityLookupByField: keyof Pick<TAssociatedFields, TAssociatedSelectedFields>,
  ): Promise<TAssociatedEntity | null> {
    const result =
      await this.authorizationResultBasedEntityAssociationLoader.loadAssociatedEntityByFieldEqualingAsync(
        fieldIdentifyingAssociatedEntity,
        associatedEntityClass,
        associatedEntityLookupByField,
      );
    return result?.enforceValue() ?? null;
  }

  /**
   * Load many associated entities identified by a field value of this entity. In a relational database,
   * the field in this entity refers to a field of the associated entity.
   * @param fieldIdentifyingAssociatedEntity - field of this entity containing the value with which to look up associated entities
   * @param associatedEntityClass - class of the associated entities
   * @param associatedEntityLookupByField - field of associated entities with which to look up the associated entities
   */
  async loadManyAssociatedEntitiesByFieldEqualingAsync<
    TAssociatedFields extends object,
    TAssociatedIDField extends keyof NonNullable<
      Pick<TAssociatedFields, TAssociatedSelectedFields>
    >,
    TAssociatedEntity extends ReadonlyEntity<
      TAssociatedFields,
      TAssociatedIDField,
      TViewerContext,
      TAssociatedSelectedFields
    >,
    TAssociatedPrivacyPolicy extends EntityPrivacyPolicy<
      TAssociatedFields,
      TAssociatedIDField,
      TViewerContext,
      TAssociatedEntity,
      TAssociatedSelectedFields
    >,
    TAssociatedSelectedFields extends keyof TAssociatedFields = keyof TAssociatedFields,
  >(
    fieldIdentifyingAssociatedEntity: keyof Pick<TFields, TSelectedFields>,
    associatedEntityClass: IEntityClass<
      TAssociatedFields,
      TAssociatedIDField,
      TViewerContext,
      TAssociatedEntity,
      TAssociatedPrivacyPolicy,
      TAssociatedSelectedFields
    >,
    associatedEntityLookupByField: keyof Pick<TAssociatedFields, TAssociatedSelectedFields>,
  ): Promise<readonly TAssociatedEntity[]> {
    return await enforceResultsAsync(
      this.authorizationResultBasedEntityAssociationLoader.loadManyAssociatedEntitiesByFieldEqualingAsync(
        fieldIdentifyingAssociatedEntity,
        associatedEntityClass,
        associatedEntityLookupByField,
      ),
    );
  }

  /**
   * Load an associated entity by folding a sequence of EntityLoadThroughDirective. At each
   * fold step, load an associated entity identified by a field value of the current fold value.
   * @param loadDirectives - associated entity load directives instructing each step of the folds
   */
  async loadAssociatedEntityThroughAsync<
    TFields2 extends object,
    TIDField2 extends keyof NonNullable<Pick<TFields2, TSelectedFields2>>,
    TEntity2 extends ReadonlyEntity<TFields2, TIDField2, TViewerContext, TSelectedFields2>,
    TPrivacyPolicy2 extends EntityPrivacyPolicy<
      TFields2,
      TIDField2,
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
        TIDField2,
        TEntity2,
        TPrivacyPolicy2,
        TSelectedFields,
        TSelectedFields2
      >,
    ],
  ): Promise<TEntity2 | null>;

  /**
   * Load an associated entity by folding a sequence of EntityLoadThroughDirective. At each
   * fold step, load an associated entity identified by a field value of the current fold value.
   * @param loadDirectives - associated entity load directives instructing each step of the folds
   */
  async loadAssociatedEntityThroughAsync<
    TFields2 extends object,
    TIDField2 extends keyof NonNullable<Pick<TFields2, TSelectedFields2>>,
    TEntity2 extends ReadonlyEntity<TFields2, TIDField2, TViewerContext, TSelectedFields2>,
    TPrivacyPolicy2 extends EntityPrivacyPolicy<
      TFields2,
      TIDField2,
      TViewerContext,
      TEntity2,
      TSelectedFields2
    >,
    TFields3 extends object,
    TIDField3 extends keyof NonNullable<Pick<TFields3, TSelectedFields3>>,
    TEntity3 extends ReadonlyEntity<TFields3, TIDField3, TViewerContext, TSelectedFields3>,
    TPrivacyPolicy3 extends EntityPrivacyPolicy<
      TFields3,
      TIDField3,
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
        TIDField2,
        TEntity2,
        TPrivacyPolicy2,
        TSelectedFields,
        TSelectedFields2
      >,
      EntityLoadThroughDirective<
        TViewerContext,
        TFields2,
        TFields3,
        TIDField3,
        TEntity3,
        TPrivacyPolicy3,
        TSelectedFields2,
        TSelectedFields3
      >,
    ],
  ): Promise<TEntity3 | null>;

  /**
   * Load an associated entity by folding a sequence of EntityLoadThroughDirective. At each
   * fold step, load an associated entity identified by a field value of the current fold value.
   * @param loadDirectives - associated entity load directives instructing each step of the folds
   */
  async loadAssociatedEntityThroughAsync<
    TFields2 extends object,
    TIDField2 extends keyof NonNullable<Pick<TFields2, TSelectedFields2>>,
    TEntity2 extends ReadonlyEntity<TFields2, TIDField2, TViewerContext, TSelectedFields2>,
    TPrivacyPolicy2 extends EntityPrivacyPolicy<
      TFields2,
      TIDField2,
      TViewerContext,
      TEntity2,
      TSelectedFields2
    >,
    TFields3 extends object,
    TIDField3 extends keyof NonNullable<Pick<TFields3, TSelectedFields3>>,
    TEntity3 extends ReadonlyEntity<TFields3, TIDField3, TViewerContext, TSelectedFields3>,
    TPrivacyPolicy3 extends EntityPrivacyPolicy<
      TFields3,
      TIDField3,
      TViewerContext,
      TEntity3,
      TSelectedFields3
    >,
    TFields4 extends object,
    TIDField4 extends keyof NonNullable<Pick<TFields4, TSelectedFields4>>,
    TEntity4 extends ReadonlyEntity<TFields4, TIDField4, TViewerContext, TSelectedFields4>,
    TPrivacyPolicy4 extends EntityPrivacyPolicy<
      TFields4,
      TIDField4,
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
        TIDField2,
        TEntity2,
        TPrivacyPolicy2,
        TSelectedFields,
        TSelectedFields2
      >,
      EntityLoadThroughDirective<
        TViewerContext,
        TFields2,
        TFields3,
        TIDField3,
        TEntity3,
        TPrivacyPolicy3,
        TSelectedFields2,
        TSelectedFields3
      >,
      EntityLoadThroughDirective<
        TViewerContext,
        TFields3,
        TFields4,
        TIDField4,
        TEntity4,
        TPrivacyPolicy4,
        TSelectedFields3,
        TSelectedFields4
      >,
    ],
  ): Promise<TEntity4 | null>;

  /**
   * Load an associated entity by folding a sequence of EntityLoadThroughDirective. At each
   * fold step, load an associated entity identified by a field value of the current fold value.
   * @param loadDirectives - associated entity load directives instructing each step of the folds
   */
  async loadAssociatedEntityThroughAsync(
    loadDirectives: EntityLoadThroughDirective<TViewerContext, any, any, any, any, any, any, any>[],
  ): Promise<ReadonlyEntity<any, any, any, any> | null>;

  async loadAssociatedEntityThroughAsync(
    loadDirectives: EntityLoadThroughDirective<TViewerContext, any, any, any, any, any, any, any>[],
  ): Promise<ReadonlyEntity<any, any, any, any> | null> {
    const result =
      await this.authorizationResultBasedEntityAssociationLoader.loadAssociatedEntityThroughAsync(
        loadDirectives,
      );
    return result?.enforceValue() ?? null;
  }
}

import { Result, asyncResult, result } from '@expo/results';
import invariant from 'invariant';
import nullthrows from 'nullthrows';

import { IEntityClass } from './Entity';
import { EntityConfiguration } from './EntityConfiguration';
import { EntityPrivacyPolicy, EntityPrivacyPolicyEvaluationContext } from './EntityPrivacyPolicy';
import { EntityQueryContext } from './EntityQueryContext';
import { ReadonlyEntity } from './ReadonlyEntity';
import { ViewerContext } from './ViewerContext';
import { pick } from './entityUtils';
import { EntityInvalidFieldValueError } from './errors/EntityInvalidFieldValueError';
import { IEntityMetricsAdapter } from './metrics/IEntityMetricsAdapter';
import { mapMapAsync } from './utils/collections/maps';

/**
 * Common entity loader utilities for entity construction and authorization.
 * Methods are exposed publicly since in rare cases they may need to be called manually.
 */
export class EntityConstructionUtils<
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
    private readonly viewerContext: TViewerContext,
    private readonly queryContext: EntityQueryContext,
    private readonly privacyPolicyEvaluationContext: EntityPrivacyPolicyEvaluationContext<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
    private readonly entityConfiguration: EntityConfiguration<TFields, TIDField>,
    private readonly entityClass: IEntityClass<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    private readonly entitySelectedFields: TSelectedFields[] | undefined,
    private readonly privacyPolicy: TPrivacyPolicy,
    protected readonly metricsAdapter: IEntityMetricsAdapter,
  ) {}

  /**
   * Construct an entity from a fields object (applying field selection if applicable),
   * checking that the ID field is specified.
   *
   * @param fieldsObject - fields object
   */
  public constructEntity(fieldsObject: TFields): TEntity {
    const idField = this.entityConfiguration.idField;
    const id = nullthrows(fieldsObject[idField], 'must provide ID to create an entity');
    const entitySelectedFields =
      this.entitySelectedFields ?? Array.from(this.entityConfiguration.schema.keys());
    const selectedFields = pick(fieldsObject, entitySelectedFields);
    return new this.entityClass({
      viewerContext: this.viewerContext,
      id: id as TFields[TIDField],
      databaseFields: fieldsObject,
      selectedFields,
    });
  }

  /**
   * Construct and authorize entities from fields map, returning error results for entities that fail
   * to construct or fail to authorize.
   *
   * @param map - map from an arbitrary key type to an array of entity field objects
   */
  public async constructAndAuthorizeEntitiesAsync<K>(
    map: ReadonlyMap<K, readonly Readonly<TFields>[]>,
  ): Promise<ReadonlyMap<K, readonly Result<TEntity>[]>> {
    return await mapMapAsync(map, async (fieldObjects) => {
      return await this.constructAndAuthorizeEntitiesArrayAsync(fieldObjects);
    });
  }

  /**
   * Construct and authorize entities from field objects array, returning error results for entities that fail
   * to construct or fail to authorize.
   *
   * @param fieldObjects - array of field objects
   */
  public async constructAndAuthorizeEntitiesArrayAsync(
    fieldObjects: readonly Readonly<TFields>[],
  ): Promise<readonly Result<TEntity>[]> {
    const uncheckedEntityResults = this.tryConstructEntities(fieldObjects);
    return await Promise.all(
      uncheckedEntityResults.map(async (uncheckedEntityResult) => {
        if (!uncheckedEntityResult.ok) {
          return uncheckedEntityResult;
        }
        return await asyncResult(
          this.privacyPolicy.authorizeReadAsync(
            this.viewerContext,
            this.queryContext,
            this.privacyPolicyEvaluationContext,
            uncheckedEntityResult.value,
            this.metricsAdapter,
          ),
        );
      }),
    );
  }

  /**
   * Validate that field values are valid according to the field's validation function.
   *
   * @param fieldName - field name to validate
   * @param fieldValues - field values to validate
   * @throws EntityInvalidFieldValueError when a field value is invalid
   */
  public validateFieldAndValues<N extends keyof Pick<TFields, TSelectedFields>>(
    fieldName: N,
    fieldValues: readonly TFields[N][],
  ): void {
    const fieldDefinition = this.entityConfiguration.schema.get(fieldName);
    invariant(fieldDefinition, `must have field definition for field = ${String(fieldName)}`);
    for (const fieldValue of fieldValues) {
      const isInputValid = fieldDefinition.validateInputValue(fieldValue);
      if (!isInputValid) {
        throw new EntityInvalidFieldValueError(this.entityClass, fieldName, fieldValue);
      }
    }
  }

  private tryConstructEntities(fieldsObjects: readonly TFields[]): readonly Result<TEntity>[] {
    return fieldsObjects.map((fieldsObject) => {
      try {
        return result(this.constructEntity(fieldsObject));
      } catch (e) {
        if (!(e instanceof Error)) {
          throw e;
        }
        return result(e);
      }
    });
  }
}

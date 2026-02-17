import invariant from 'invariant';
import nullthrows from 'nullthrows';

import { EntityConfiguration } from '../EntityConfiguration';

/**
 * @internal
 */
export interface FieldTransformer<T> {
  /**
   * Transformation to apply when a value is read from an adapter.
   */
  read?: (value: any) => T | null;

  /**
   * Transformation to apply when a value is written to an adapter.
   */
  write?: (value: T | null) => any;
}

/**
 * Map from concrete EntityFieldDefinition implementation class name to field transformer.
 *
 * @internal
 */
export type FieldTransformerMap = Map<string, FieldTransformer<any>>;

/**
 * @internal
 */
export const getDatabaseFieldForEntityField = <
  TFields extends Record<string, any>,
  TIDField extends keyof TFields,
>(
  entityConfiguration: EntityConfiguration<TFields, TIDField>,
  entityField: keyof TFields,
): string => {
  const databaseField = entityConfiguration.entityToDBFieldsKeyMapping.get(entityField);
  invariant(databaseField, `database field mapping missing for ${String(entityField)}`);
  return databaseField;
};

/**
 * @internal
 */
export const transformDatabaseObjectToFields = <
  TFields extends Record<string, any>,
  TIDField extends keyof TFields,
>(
  entityConfiguration: EntityConfiguration<TFields, TIDField>,
  fieldTransformerMap: FieldTransformerMap,
  databaseObject: { [key: string]: any },
): Readonly<TFields> => {
  const fields: Partial<TFields> = {};
  for (const k in databaseObject) {
    const val = databaseObject[k];
    const fieldsKey = entityConfiguration.dbToEntityFieldsKeyMapping.get(k);
    if (fieldsKey) {
      fields[fieldsKey] = maybeTransformDatabaseValueToFieldValue(
        entityConfiguration,
        fieldTransformerMap,
        fieldsKey,
        val,
      );
    }
  }
  return fields as Readonly<TFields>;
};

/**
 * @internal
 */
export const transformFieldsToDatabaseObject = <
  TFields extends Record<string, any>,
  TIDField extends keyof TFields,
>(
  entityConfiguration: EntityConfiguration<TFields, TIDField>,
  fieldTransformerMap: FieldTransformerMap,
  fields: Readonly<Partial<TFields>>,
): object => {
  const databaseObject: { [key: string]: any } = {};
  for (const k in fields) {
    const val = fields[k]!;
    const databaseKey = entityConfiguration.entityToDBFieldsKeyMapping.get(k);
    invariant(databaseKey, `must be database key for field: ${k}`);
    databaseObject[databaseKey] = maybeTransformFieldValueToDatabaseValue(
      entityConfiguration,
      fieldTransformerMap,
      k,
      val,
    );
  }
  return databaseObject;
};

/**
 * @internal
 */
export const transformCacheObjectToFields = <
  TFields extends Record<string, any>,
  TIDField extends keyof TFields,
>(
  entityConfiguration: EntityConfiguration<TFields, TIDField>,
  fieldTransformerMap: FieldTransformerMap,
  cacheObject: { [key: string]: any },
): Readonly<TFields> => {
  const fields: Partial<TFields> = {};
  for (const fieldsKey in cacheObject) {
    const val = cacheObject[fieldsKey]!;
    fields[fieldsKey as keyof TFields] = maybeTransformCacheValueToFieldValue(
      entityConfiguration,
      fieldTransformerMap,
      fieldsKey as keyof TFields,
      val,
    );
  }
  return fields as Readonly<TFields>;
};

/**
 * @internal
 */
export const transformFieldsToCacheObject = <
  TFields extends Record<string, any>,
  TIDField extends keyof TFields,
>(
  entityConfiguration: EntityConfiguration<TFields, TIDField>,
  fieldTransformerMap: FieldTransformerMap,
  fields: Readonly<Partial<TFields>>,
): object => {
  const cacheObject: { [key: string]: any } = {};
  for (const fieldsKey in fields) {
    const val = fields[fieldsKey]!;
    cacheObject[fieldsKey] = maybeTransformFieldValueToCacheValue(
      entityConfiguration,
      fieldTransformerMap,
      fieldsKey,
      val,
    );
  }
  return cacheObject;
};

const maybeTransformDatabaseValueToFieldValue = <
  TFields extends Record<string, any>,
  N extends keyof TFields,
  TIDField extends keyof TFields,
>(
  entityConfiguration: EntityConfiguration<TFields, TIDField>,
  fieldTransformerMap: FieldTransformerMap,
  fieldName: N,
  value: any,
): TFields[N] => {
  // this will always be non-null due to the way the dbToEntityFieldsKeyMapping is computed and this
  // function is called conditionally
  const fieldDefinition = nullthrows(entityConfiguration.schema.get(fieldName));
  const transformer = fieldTransformerMap.get(fieldDefinition.constructor.name);
  const readTransformer = transformer?.read;
  return readTransformer ? readTransformer(value) : value;
};

const maybeTransformFieldValueToDatabaseValue = <
  TFields extends Record<string, any>,
  N extends keyof TFields,
  TIDField extends keyof TFields,
>(
  entityConfiguration: EntityConfiguration<TFields, TIDField>,
  fieldTransformerMap: FieldTransformerMap,
  fieldName: N,
  value: TFields[N],
): any => {
  const fieldDefinition = nullthrows(entityConfiguration.schema.get(fieldName));
  const transformer = fieldTransformerMap.get(fieldDefinition.constructor.name);
  const writeTransformer = transformer?.write;
  return writeTransformer ? writeTransformer(value) : value;
};

const maybeTransformCacheValueToFieldValue = <
  TFields extends Record<string, any>,
  N extends keyof TFields,
  TIDField extends keyof TFields,
>(
  entityConfiguration: EntityConfiguration<TFields, TIDField>,
  fieldTransformerMap: FieldTransformerMap,
  fieldName: N,
  value: any,
): TFields[N] => {
  const fieldDefinition = entityConfiguration.schema.get(fieldName);
  if (!fieldDefinition) {
    return value;
  }

  const transformer = fieldTransformerMap.get(fieldDefinition.constructor.name);
  const readTransformer = transformer?.read;
  return readTransformer ? readTransformer(value) : value;
};

const maybeTransformFieldValueToCacheValue = <
  TFields extends Record<string, any>,
  N extends keyof TFields,
  TIDField extends keyof TFields,
>(
  entityConfiguration: EntityConfiguration<TFields, TIDField>,
  fieldTransformerMap: FieldTransformerMap,
  fieldName: N,
  value: TFields[N],
): any => {
  const fieldDefinition = entityConfiguration.schema.get(fieldName);
  if (!fieldDefinition) {
    return value;
  }

  const transformer = fieldTransformerMap.get(fieldDefinition.constructor.name);
  const writeTransformer = transformer?.write;
  return writeTransformer ? writeTransformer(value) : value;
};

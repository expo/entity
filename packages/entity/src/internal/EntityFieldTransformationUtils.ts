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
 * Precomputed map from field name to its transformer. This eliminates two lookups
 * (schema + constructor.name) per field during transformation, replacing them with
 * a single direct lookup.
 *
 * @internal
 */
export type PrecomputedFieldTransformerMap<TFields> = ReadonlyMap<
  keyof TFields,
  FieldTransformer<any> | undefined
>;

/**
 * Build a precomputed map from field name to transformer. This is called once during
 * adapter construction to avoid repeated lookups during field transformation.
 *
 * @internal
 */
export const buildPrecomputedFieldTransformerMap = <
  TFields extends Record<string, any>,
  TIDField extends keyof TFields,
>(
  entityConfiguration: EntityConfiguration<TFields, TIDField>,
  fieldTransformerMap: FieldTransformerMap,
): PrecomputedFieldTransformerMap<TFields> => {
  const map = new Map<keyof TFields, FieldTransformer<any> | undefined>();
  for (const [fieldName, fieldDefinition] of entityConfiguration.schema) {
    const transformer = fieldTransformerMap.get(fieldDefinition.constructor.name);
    map.set(fieldName, transformer);
  }
  return map;
};

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
  precomputedFieldTransformerMap?: PrecomputedFieldTransformerMap<TFields>,
): Readonly<TFields> => {
  const fields: TFields = {} as any;
  for (const k in databaseObject) {
    const val = databaseObject[k];
    const fieldsKey = entityConfiguration.dbToEntityFieldsKeyMapping.get(k);
    if (fieldsKey) {
      fields[fieldsKey] = maybeTransformDatabaseValueToFieldValue(
        entityConfiguration,
        fieldTransformerMap,
        fieldsKey,
        val,
        precomputedFieldTransformerMap,
      );
    }
  }
  return fields;
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
  precomputedFieldTransformerMap?: PrecomputedFieldTransformerMap<TFields>,
): object => {
  const databaseObject: { [key: string]: any } = {};
  for (const k in fields) {
    const val = fields[k]!;
    const databaseKey = entityConfiguration.entityToDBFieldsKeyMapping.get(k as any);
    invariant(databaseKey, `must be database key for field: ${k}`);
    databaseObject[databaseKey] = maybeTransformFieldValueToDatabaseValue(
      entityConfiguration,
      fieldTransformerMap,
      k,
      val,
      precomputedFieldTransformerMap,
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
  const fields: TFields = {} as any;
  for (const fieldsKey in cacheObject) {
    const val = cacheObject[fieldsKey]!;
    fields[fieldsKey as keyof TFields] = maybeTransformCacheValueToFieldValue(
      entityConfiguration,
      fieldTransformerMap,
      fieldsKey as keyof TFields,
      val,
    );
  }
  return fields;
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
  precomputedFieldTransformerMap?: PrecomputedFieldTransformerMap<TFields>,
): TFields[N] => {
  // Use precomputed map when available to avoid two lookups per field
  let transformer: FieldTransformer<any> | undefined;
  if (precomputedFieldTransformerMap) {
    transformer = precomputedFieldTransformerMap.get(fieldName);
  } else {
    const fieldDefinition = nullthrows(entityConfiguration.schema.get(fieldName));
    transformer = fieldTransformerMap.get(fieldDefinition.constructor.name);
  }
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
  precomputedFieldTransformerMap?: PrecomputedFieldTransformerMap<TFields>,
): any => {
  // Use precomputed map when available to avoid two lookups per field
  let transformer: FieldTransformer<any> | undefined;
  if (precomputedFieldTransformerMap) {
    transformer = precomputedFieldTransformerMap.get(fieldName);
  } else {
    const fieldDefinition = nullthrows(entityConfiguration.schema.get(fieldName));
    transformer = fieldTransformerMap.get(fieldDefinition.constructor.name);
  }
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

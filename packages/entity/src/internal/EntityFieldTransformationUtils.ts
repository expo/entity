import invariant from 'invariant';

import EntityConfiguration from '../EntityConfiguration';

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
 */
export type FieldTransformerMap = Map<string, FieldTransformer<any>>;

export const getDatabaseFieldForEntityField = <TDatabaseFields>(
  entityConfiguration: EntityConfiguration<TDatabaseFields>,
  entityField: keyof TDatabaseFields
): string => {
  const databaseField = entityConfiguration.entityToDBFieldsKeyMapping.get(entityField);
  invariant(databaseField, `database field mapping missing for ${entityField}`);
  return databaseField!;
};

export const transformDatabaseObjectToFields = <TDatabaseFields>(
  entityConfiguration: EntityConfiguration<TDatabaseFields>,
  fieldTransformerMap: FieldTransformerMap,
  databaseObject: { [key: string]: any }
): Readonly<TDatabaseFields> => {
  const fields: TDatabaseFields = {} as any;
  for (const k in databaseObject) {
    const val = databaseObject[k];
    const fieldsKey = entityConfiguration.dbToEntityFieldsKeyMapping.get(k);
    if (fieldsKey) {
      fields[fieldsKey] = maybeTransformDatabaseValueToFieldValue(
        entityConfiguration,
        fieldTransformerMap,
        fieldsKey,
        val
      );
    }
  }
  return fields;
};

export const transformFieldsToDatabaseObject = <TDatabaseFields>(
  entityConfiguration: EntityConfiguration<TDatabaseFields>,
  fieldTransformerMap: FieldTransformerMap,
  fields: Readonly<Partial<TDatabaseFields>>
): object => {
  const databaseObject: { [key: string]: any } = {};
  for (const k in fields) {
    const val = fields[k]!;
    const databaseKey = entityConfiguration.entityToDBFieldsKeyMapping.get(k as any);
    invariant(databaseKey, `must be database key for field: ${k}`);
    databaseObject[databaseKey!] = maybeTransformFieldValueToDatabaseValue(
      entityConfiguration,
      fieldTransformerMap,
      k,
      val
    );
  }
  return databaseObject;
};

export const transformCacheObjectToFields = <TDatabaseFields>(
  entityConfiguration: EntityConfiguration<TDatabaseFields>,
  fieldTransformerMap: FieldTransformerMap,
  cacheObject: { [key: string]: any }
): Readonly<TDatabaseFields> => {
  const fields: TDatabaseFields = {} as any;
  for (const fieldsKey in cacheObject) {
    const val = cacheObject[fieldsKey]!;
    fields[fieldsKey as keyof TDatabaseFields] = maybeTransformCacheValueToFieldValue(
      entityConfiguration,
      fieldTransformerMap,
      fieldsKey as keyof TDatabaseFields,
      val
    );
  }
  return fields;
};

export const transformFieldsToCacheObject = <TDatabaseFields>(
  entityConfiguration: EntityConfiguration<TDatabaseFields>,
  fieldTransformerMap: FieldTransformerMap,
  fields: Readonly<Partial<TDatabaseFields>>
): object => {
  const cacheObject: { [key: string]: any } = {};
  for (const fieldsKey in fields) {
    const val = fields[fieldsKey]!;
    cacheObject[fieldsKey] = maybeTransformFieldValueToCacheValue(
      entityConfiguration,
      fieldTransformerMap,
      fieldsKey,
      val
    );
  }
  return cacheObject;
};

const maybeTransformDatabaseValueToFieldValue = <TDatabaseFields, N extends keyof TDatabaseFields>(
  entityConfiguration: EntityConfiguration<TDatabaseFields>,
  fieldTransformerMap: FieldTransformerMap,
  fieldName: N,
  value: any
): TDatabaseFields[N] => {
  const fieldDefinition = entityConfiguration.schema.get(fieldName);
  if (!fieldDefinition) {
    return value;
  }

  const transformer = fieldTransformerMap.get(fieldDefinition.constructor.name);
  const readTransformer = transformer?.read;
  return readTransformer ? readTransformer(value) : value;
};

const maybeTransformFieldValueToDatabaseValue = <TDatabaseFields, N extends keyof TDatabaseFields>(
  entityConfiguration: EntityConfiguration<TDatabaseFields>,
  fieldTransformerMap: FieldTransformerMap,
  fieldName: N,
  value: TDatabaseFields[N]
): any => {
  const fieldDefinition = entityConfiguration.schema.get(fieldName);
  if (!fieldDefinition) {
    return value;
  }

  const transformer = fieldTransformerMap.get(fieldDefinition.constructor.name);
  const writeTransformer = transformer?.write;
  return writeTransformer ? writeTransformer(value) : value;
};

const maybeTransformCacheValueToFieldValue = <TDatabaseFields, N extends keyof TDatabaseFields>(
  entityConfiguration: EntityConfiguration<TDatabaseFields>,
  fieldTransformerMap: FieldTransformerMap,
  fieldName: N,
  value: any
): TDatabaseFields[N] => {
  const fieldDefinition = entityConfiguration.schema.get(fieldName);
  if (!fieldDefinition) {
    return value;
  }

  const transformer = fieldTransformerMap.get(fieldDefinition.constructor.name);
  const readTransformer = transformer?.read;
  return readTransformer ? readTransformer(value) : value;
};

const maybeTransformFieldValueToCacheValue = <TDatabaseFields, N extends keyof TDatabaseFields>(
  entityConfiguration: EntityConfiguration<TDatabaseFields>,
  fieldTransformerMap: FieldTransformerMap,
  fieldName: N,
  value: TDatabaseFields[N]
): any => {
  const fieldDefinition = entityConfiguration.schema.get(fieldName);
  if (!fieldDefinition) {
    return value;
  }

  const transformer = fieldTransformerMap.get(fieldDefinition.constructor.name);
  const writeTransformer = transformer?.write;
  return writeTransformer ? writeTransformer(value) : value;
};

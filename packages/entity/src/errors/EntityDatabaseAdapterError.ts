import { EntityError, EntityErrorCode, EntityErrorState } from './EntityError';

/**
 * Base class for all errors related to the database adapter.
 */
export abstract class EntityDatabaseAdapterError extends EntityError {}

/**
 * Thrown when a transient error occurrs within the database adapter.
 * Transient errors may succeed if retried.
 */
export class EntityDatabaseAdapterTransientError extends EntityDatabaseAdapterError {
  public readonly state = EntityErrorState.TRANSIENT;
  public readonly code = EntityErrorCode.ERR_ENTITY_DATABASE_ADAPTER_TRANSIENT;
}

/**
 * Thrown when an unknown error occurrs within the database adapter.
 * This is a catch-all error class for DBMS-specific errors that do not fit into other categories.
 */
export class EntityDatabaseAdapterUnknownError extends EntityDatabaseAdapterError {
  public readonly state = EntityErrorState.UNKNOWN;
  public readonly code = EntityErrorCode.ERR_ENTITY_DATABASE_ADAPTER_UNKNOWN;
}

/**
 * Thrown when a check constraint is violated within the database adapter.
 * This indicates that a value being inserted or updated does not satisfy a defined data integrity constraint.
 */
export class EntityDatabaseAdapterCheckConstraintError extends EntityDatabaseAdapterError {
  public readonly state = EntityErrorState.PERMANENT;
  public readonly code = EntityErrorCode.ERR_ENTITY_DATABASE_ADAPTER_CHECK_CONSTRAINT;
}

/**
 * Thrown when an exclusion constraint is violated within the database adapter.
 * This indicates that a value being inserted or updated conflicts with an existing value based on a defined exclusion constraint.
 */
export class EntityDatabaseAdapterExclusionConstraintError extends EntityDatabaseAdapterError {
  public readonly state = EntityErrorState.PERMANENT;
  public readonly code = EntityErrorCode.ERR_ENTITY_DATABASE_ADAPTER_EXCLUSION_CONSTRAINT;
}

/**
 * Thrown when a foreign key constraint is violated within the database adapter.
 * This indicates that a value being inserted, updated, or deleted references a non-existent value in a related table
 * or is referenced in a related table.
 */
export class EntityDatabaseAdapterForeignKeyConstraintError extends EntityDatabaseAdapterError {
  public readonly state = EntityErrorState.PERMANENT;
  public readonly code = EntityErrorCode.ERR_ENTITY_DATABASE_ADAPTER_FOREIGN_KEY_CONSTRAINT;
}

/**
 * Thrown when a not-null constraint is violated within the database adapter.
 * This indicates that a null value is being inserted or updated into a column that does not allow null values.
 */
export class EntityDatabaseAdapterNotNullConstraintError extends EntityDatabaseAdapterError {
  public readonly state = EntityErrorState.PERMANENT;
  public readonly code = EntityErrorCode.ERR_ENTITY_DATABASE_ADAPTER_NOT_NULL_CONSTRAINT;
}

/**
 * Thrown when a unique constraint is violated within the database adapter.
 * This indicates that a value being inserted or updated duplicates an existing value in a column or set of columns
 * that require unique values.
 */
export class EntityDatabaseAdapterUniqueConstraintError extends EntityDatabaseAdapterError {
  public readonly state = EntityErrorState.PERMANENT;
  public readonly code = EntityErrorCode.ERR_ENTITY_DATABASE_ADAPTER_UNIQUE_CONSTRAINT;
}

/**
 * Thrown when an insert operation returns more results than expected. Only one row is expected.
 * These should never happen with a properly implemented database adapter unless the underlying database has nonstandard
 * triggers or something similar.
 */
export class EntityDatabaseAdapterExcessiveInsertResultError extends EntityDatabaseAdapterError {
  public readonly state = EntityErrorState.PERMANENT;
  public readonly code = EntityErrorCode.ERR_ENTITY_DATABASE_ADAPTER_EXCESSIVE_INSERT_RESULT;
}

/**
 * Thrown when an insert operation returns no results. One row is expected.
 * These should never happen with a properly implemented database adapter unless the underlying database has nonstandard
 * triggers or something similar.
 */
export class EntityDatabaseAdapterEmptyInsertResultError extends EntityDatabaseAdapterError {
  public readonly state = EntityErrorState.PERMANENT;
  public readonly code = EntityErrorCode.ERR_ENTITY_DATABASE_ADAPTER_EMPTY_INSERT_RESULT;
}

/**
 * Thrown when an update operation returns more results than expected. Only one row is expected.
 * These should never happen with a properly implemented database adapter unless the underlying table has a non-unique
 * primary key column.
 */
export class EntityDatabaseAdapterExcessiveUpdateResultError extends EntityDatabaseAdapterError {
  public readonly state = EntityErrorState.PERMANENT;
  public readonly code = EntityErrorCode.ERR_ENTITY_DATABASE_ADAPTER_EXCESSIVE_UPDATE_RESULT;
}

/**
 * Thrown when an update operation returns no results. One row is expected.
 * This most often happens when attempting to update a non-existent row, often indicating that the row
 * was deleted by a different process between fetching and updating it in this process.
 */
export class EntityDatabaseAdapterEmptyUpdateResultError extends EntityDatabaseAdapterError {
  public readonly state = EntityErrorState.PERMANENT;
  public readonly code = EntityErrorCode.ERR_ENTITY_DATABASE_ADAPTER_EMPTY_UPDATE_RESULT;
}

/**
 * Thrown when a delete operation returns more results than expected. Only one row is expected.
 * These should never happen with a properly implemented database adapter unless the underlying table has a non-unique
 * primary key column.
 */
export class EntityDatabaseAdapterExcessiveDeleteResultError extends EntityDatabaseAdapterError {
  public readonly state = EntityErrorState.PERMANENT;
  public readonly code = EntityErrorCode.ERR_ENTITY_DATABASE_ADAPTER_EXCESSIVE_DELETE_RESULT;
}

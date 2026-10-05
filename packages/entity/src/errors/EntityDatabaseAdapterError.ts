import { EntityError, EntityErrorCode, EntityErrorState } from './EntityError.ts';

/**
 * Base class for all errors related to the database adapter.
 */
export abstract class EntityDatabaseAdapterError extends EntityError {
  static {
    this.prototype.name = 'EntityDatabaseAdapterError';
  }
}

/**
 * Thrown when a unique constraint is violated within the database adapter.
 * This indicates that a value being inserted or updated duplicates an existing value in a column or set of columns
 * that require unique values.
 */
export class EntityDatabaseAdapterUniqueConstraintError extends EntityDatabaseAdapterError {
  static {
    this.prototype.name = 'EntityDatabaseAdapterUniqueConstraintError';
  }

  get state(): EntityErrorState.PERMANENT {
    return EntityErrorState.PERMANENT;
  }

  get code(): EntityErrorCode.ERR_ENTITY_DATABASE_ADAPTER_UNIQUE_CONSTRAINT {
    return EntityErrorCode.ERR_ENTITY_DATABASE_ADAPTER_UNIQUE_CONSTRAINT;
  }
}

/**
 * Thrown when an insert operation returns more results than expected. Only one row is expected.
 * These should never happen with a properly implemented database adapter unless the underlying database has nonstandard
 * triggers or something similar.
 */
export class EntityDatabaseAdapterExcessiveInsertResultError extends EntityDatabaseAdapterError {
  static {
    this.prototype.name = 'EntityDatabaseAdapterExcessiveInsertResultError';
  }

  get state(): EntityErrorState.PERMANENT {
    return EntityErrorState.PERMANENT;
  }

  get code(): EntityErrorCode.ERR_ENTITY_DATABASE_ADAPTER_EXCESSIVE_INSERT_RESULT {
    return EntityErrorCode.ERR_ENTITY_DATABASE_ADAPTER_EXCESSIVE_INSERT_RESULT;
  }
}

/**
 * Thrown when an insert operation returns no results. One row is expected.
 * These should never happen with a properly implemented database adapter unless the underlying database has nonstandard
 * triggers or something similar.
 */
export class EntityDatabaseAdapterEmptyInsertResultError extends EntityDatabaseAdapterError {
  static {
    this.prototype.name = 'EntityDatabaseAdapterEmptyInsertResultError';
  }

  get state(): EntityErrorState.PERMANENT {
    return EntityErrorState.PERMANENT;
  }

  get code(): EntityErrorCode.ERR_ENTITY_DATABASE_ADAPTER_EMPTY_INSERT_RESULT {
    return EntityErrorCode.ERR_ENTITY_DATABASE_ADAPTER_EMPTY_INSERT_RESULT;
  }
}

/**
 * Thrown when an update operation returns more results than expected. Only one row is expected.
 * These should never happen with a properly implemented database adapter unless the underlying table has a non-unique
 * primary key column.
 */
export class EntityDatabaseAdapterExcessiveUpdateResultError extends EntityDatabaseAdapterError {
  static {
    this.prototype.name = 'EntityDatabaseAdapterExcessiveUpdateResultError';
  }

  get state(): EntityErrorState.PERMANENT {
    return EntityErrorState.PERMANENT;
  }

  get code(): EntityErrorCode.ERR_ENTITY_DATABASE_ADAPTER_EXCESSIVE_UPDATE_RESULT {
    return EntityErrorCode.ERR_ENTITY_DATABASE_ADAPTER_EXCESSIVE_UPDATE_RESULT;
  }
}

/**
 * Thrown when an update operation returns no results. One row is expected.
 * This most often happens when attempting to update a non-existent row, often indicating that the row
 * was deleted by a different process between fetching and updating it in this process.
 */
export class EntityDatabaseAdapterEmptyUpdateResultError extends EntityDatabaseAdapterError {
  static {
    this.prototype.name = 'EntityDatabaseAdapterEmptyUpdateResultError';
  }

  get state(): EntityErrorState.PERMANENT {
    return EntityErrorState.PERMANENT;
  }

  get code(): EntityErrorCode.ERR_ENTITY_DATABASE_ADAPTER_EMPTY_UPDATE_RESULT {
    return EntityErrorCode.ERR_ENTITY_DATABASE_ADAPTER_EMPTY_UPDATE_RESULT;
  }
}

/**
 * Thrown when a delete operation returns more results than expected. Only one row is expected.
 * These should never happen with a properly implemented database adapter unless the underlying table has a non-unique
 * primary key column.
 */
export class EntityDatabaseAdapterExcessiveDeleteResultError extends EntityDatabaseAdapterError {
  static {
    this.prototype.name = 'EntityDatabaseAdapterExcessiveDeleteResultError';
  }

  get state(): EntityErrorState.PERMANENT {
    return EntityErrorState.PERMANENT;
  }

  get code(): EntityErrorCode.ERR_ENTITY_DATABASE_ADAPTER_EXCESSIVE_DELETE_RESULT {
    return EntityErrorCode.ERR_ENTITY_DATABASE_ADAPTER_EXCESSIVE_DELETE_RESULT;
  }
}

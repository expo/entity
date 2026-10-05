import { EntityDatabaseAdapterError, EntityErrorState } from '@expo/entity';

/**
 * Error code for an entity error thrown by the knex database adapter.
 * Each error code should map to a specific class of Entity error.
 */
export enum KnexEntityDatabaseAdapterErrorCode {
  ERR_ENTITY_DATABASE_ADAPTER_TRANSIENT = 'ERR_ENTITY_DATABASE_ADAPTER_TRANSIENT',
  ERR_ENTITY_DATABASE_ADAPTER_UNKNOWN = 'ERR_ENTITY_DATABASE_ADAPTER_UNKNOWN',
  ERR_ENTITY_DATABASE_ADAPTER_CHECK_CONSTRAINT = 'ERR_ENTITY_DATABASE_ADAPTER_CHECK_CONSTRAINT',
  ERR_ENTITY_DATABASE_ADAPTER_EXCLUSION_CONSTRAINT = 'ERR_ENTITY_DATABASE_ADAPTER_EXCLUSION_CONSTRAINT',
  ERR_ENTITY_DATABASE_ADAPTER_FOREIGN_KEY_CONSTRAINT = 'ERR_ENTITY_DATABASE_ADAPTER_FOREIGN_KEY_CONSTRAINT',
  ERR_ENTITY_DATABASE_ADAPTER_NOT_NULL_CONSTRAINT = 'ERR_ENTITY_DATABASE_ADAPTER_NOT_NULL_CONSTRAINT',
  ERR_ENTITY_DATABASE_ADAPTER_PAGINATION_CURSOR_INVALID = 'ERR_ENTITY_DATABASE_ADAPTER_PAGINATION_CURSOR_INVALID',
}

/**
 * Thrown when a transient error occurrs within the database adapter.
 * Transient errors may succeed if retried.
 */
export class EntityDatabaseAdapterTransientError extends EntityDatabaseAdapterError {
  static {
    this.prototype.name = 'EntityDatabaseAdapterTransientError';
  }

  get state(): EntityErrorState.TRANSIENT {
    return EntityErrorState.TRANSIENT;
  }

  get code(): KnexEntityDatabaseAdapterErrorCode.ERR_ENTITY_DATABASE_ADAPTER_TRANSIENT {
    return KnexEntityDatabaseAdapterErrorCode.ERR_ENTITY_DATABASE_ADAPTER_TRANSIENT;
  }
}

/**
 * Thrown when an unknown error occurrs within the database adapter.
 * This is a catch-all error class for DBMS-specific errors that do not fit into other categories.
 */
export class EntityDatabaseAdapterUnknownError extends EntityDatabaseAdapterError {
  static {
    this.prototype.name = 'EntityDatabaseAdapterUnknownError';
  }

  get state(): EntityErrorState.UNKNOWN {
    return EntityErrorState.UNKNOWN;
  }

  get code(): KnexEntityDatabaseAdapterErrorCode.ERR_ENTITY_DATABASE_ADAPTER_UNKNOWN {
    return KnexEntityDatabaseAdapterErrorCode.ERR_ENTITY_DATABASE_ADAPTER_UNKNOWN;
  }
}

/**
 * Thrown when a check constraint is violated within the database adapter.
 * This indicates that a value being inserted or updated does not satisfy a defined data integrity constraint.
 */
export class EntityDatabaseAdapterCheckConstraintError extends EntityDatabaseAdapterError {
  static {
    this.prototype.name = 'EntityDatabaseAdapterCheckConstraintError';
  }

  get state(): EntityErrorState.PERMANENT {
    return EntityErrorState.PERMANENT;
  }

  get code(): KnexEntityDatabaseAdapterErrorCode.ERR_ENTITY_DATABASE_ADAPTER_CHECK_CONSTRAINT {
    return KnexEntityDatabaseAdapterErrorCode.ERR_ENTITY_DATABASE_ADAPTER_CHECK_CONSTRAINT;
  }
}

/**
 * Thrown when an exclusion constraint is violated within the database adapter.
 * This indicates that a value being inserted or updated conflicts with an existing value based on a defined exclusion constraint.
 */
export class EntityDatabaseAdapterExclusionConstraintError extends EntityDatabaseAdapterError {
  static {
    this.prototype.name = 'EntityDatabaseAdapterExclusionConstraintError';
  }

  get state(): EntityErrorState.PERMANENT {
    return EntityErrorState.PERMANENT;
  }

  get code(): KnexEntityDatabaseAdapterErrorCode.ERR_ENTITY_DATABASE_ADAPTER_EXCLUSION_CONSTRAINT {
    return KnexEntityDatabaseAdapterErrorCode.ERR_ENTITY_DATABASE_ADAPTER_EXCLUSION_CONSTRAINT;
  }
}

/**
 * Thrown when a foreign key constraint is violated within the database adapter.
 * This indicates that a value being inserted, updated, or deleted references a non-existent value in a related table
 * or is referenced in a related table.
 */
export class EntityDatabaseAdapterForeignKeyConstraintError extends EntityDatabaseAdapterError {
  static {
    this.prototype.name = 'EntityDatabaseAdapterForeignKeyConstraintError';
  }

  get state(): EntityErrorState.PERMANENT {
    return EntityErrorState.PERMANENT;
  }

  get code(): KnexEntityDatabaseAdapterErrorCode.ERR_ENTITY_DATABASE_ADAPTER_FOREIGN_KEY_CONSTRAINT {
    return KnexEntityDatabaseAdapterErrorCode.ERR_ENTITY_DATABASE_ADAPTER_FOREIGN_KEY_CONSTRAINT;
  }
}

/**
 * Thrown when a not-null constraint is violated within the database adapter.
 * This indicates that a null value is being inserted or updated into a column that does not allow null values.
 */
export class EntityDatabaseAdapterNotNullConstraintError extends EntityDatabaseAdapterError {
  static {
    this.prototype.name = 'EntityDatabaseAdapterNotNullConstraintError';
  }

  get state(): EntityErrorState.PERMANENT {
    return EntityErrorState.PERMANENT;
  }

  get code(): KnexEntityDatabaseAdapterErrorCode.ERR_ENTITY_DATABASE_ADAPTER_NOT_NULL_CONSTRAINT {
    return KnexEntityDatabaseAdapterErrorCode.ERR_ENTITY_DATABASE_ADAPTER_NOT_NULL_CONSTRAINT;
  }
}

/**
 * Thrown when a pagination cursor cannot be decoded or does not match the expected pagination
 * specification.
 */
export class EntityDatabaseAdapterPaginationCursorInvalidError extends EntityDatabaseAdapterError {
  static {
    this.prototype.name = 'EntityDatabaseAdapterPaginationCursorInvalidError';
  }

  get state(): EntityErrorState.PERMANENT {
    return EntityErrorState.PERMANENT;
  }

  get code(): KnexEntityDatabaseAdapterErrorCode.ERR_ENTITY_DATABASE_ADAPTER_PAGINATION_CURSOR_INVALID {
    return KnexEntityDatabaseAdapterErrorCode.ERR_ENTITY_DATABASE_ADAPTER_PAGINATION_CURSOR_INVALID;
  }
}

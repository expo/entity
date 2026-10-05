/**
 * The state of an entity error, indicating whether it may be transient/retryable.
 */
export enum EntityErrorState {
  UNKNOWN,
  TRANSIENT,
  PERMANENT,
}

/**
 * Error code for an entity error defined in this package. Each error code should map to a specific class of Entity error.
 * Other packages that define entity errors (such as database adapter implementations) define their own error code enums.
 */
export enum EntityErrorCode {
  ERR_ENTITY_NOT_AUTHORIZED = 'ERR_ENTITY_NOT_AUTHORIZED',
  ERR_ENTITY_NOT_FOUND = 'ERR_ENTITY_NOT_FOUND',
  ERR_ENTITY_INVALID_FIELD_VALUE = 'ERR_ENTITY_INVALID_FIELD_VALUE',
  ERR_ENTITY_DATABASE_ADAPTER_UNIQUE_CONSTRAINT = 'ERR_ENTITY_DATABASE_ADAPTER_UNIQUE_CONSTRAINT',
  ERR_ENTITY_DATABASE_ADAPTER_EXCESSIVE_INSERT_RESULT = 'ERR_ENTITY_DATABASE_ADAPTER_EXCESSIVE_INSERT_RESULT',
  ERR_ENTITY_DATABASE_ADAPTER_EMPTY_INSERT_RESULT = 'ERR_ENTITY_DATABASE_ADAPTER_EMPTY_INSERT_RESULT',
  ERR_ENTITY_DATABASE_ADAPTER_EXCESSIVE_UPDATE_RESULT = 'ERR_ENTITY_DATABASE_ADAPTER_EXCESSIVE_UPDATE_RESULT',
  ERR_ENTITY_DATABASE_ADAPTER_EMPTY_UPDATE_RESULT = 'ERR_ENTITY_DATABASE_ADAPTER_EMPTY_UPDATE_RESULT',
  ERR_ENTITY_DATABASE_ADAPTER_EXCESSIVE_DELETE_RESULT = 'ERR_ENTITY_DATABASE_ADAPTER_EXCESSIVE_DELETE_RESULT',
  ERR_ENTITY_CACHE_ADAPTER_TRANSIENT = 'ERR_ENTITY_CACHE_ADAPTER_TRANSIENT',
}

/**
 * Base class for all known errors thrown by the entity system.
 */
export abstract class EntityError extends Error {
  static {
    this.prototype.name = 'EntityError';
  }

  public abstract readonly state: EntityErrorState;
  public abstract readonly code: string;

  constructor(message: string, cause?: Error) {
    super(message, { cause });
  }
}

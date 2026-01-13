import { EntityError, EntityErrorCode, EntityErrorState } from './EntityError';

/**
 * Base class for errors thrown by the entity cache adapter.
 */
export abstract class EntityCacheAdapterError extends EntityError {
  static {
    this.prototype.name = 'EntityCacheAdapterError';
  }
}

/**
 * Error thrown when a transient error occurs in the entity cache adapter.
 * Transient errors may succeed if retried.
 */
export class EntityCacheAdapterTransientError extends EntityCacheAdapterError {
  static {
    this.prototype.name = 'EntityCacheAdapterTransientError';
  }

  get state(): EntityErrorState.TRANSIENT {
    return EntityErrorState.TRANSIENT;
  }

  get code(): EntityErrorCode.ERR_ENTITY_CACHE_ADAPTER_TRANSIENT {
    return EntityErrorCode.ERR_ENTITY_CACHE_ADAPTER_TRANSIENT;
  }
}

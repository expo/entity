import { EntityError, EntityErrorCode, EntityErrorState } from './EntityError';

/**
 * Base class for errors thrown by the entity cache adapter.
 */
export abstract class EntityCacheAdapterError extends EntityError {}

/**
 * Error thrown when a transient error occurs in the entity cache adapter.
 * Transient errors may succeed if retried.
 */
export class EntityCacheAdapterTransientError extends EntityCacheAdapterError {
  public readonly state = EntityErrorState.TRANSIENT;
  public readonly code = EntityErrorCode.ERR_ENTITY_CACHE_ADAPTER_TRANSIENT;
}

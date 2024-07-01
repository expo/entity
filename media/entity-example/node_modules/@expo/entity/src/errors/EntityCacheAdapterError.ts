import EntityError, { EntityErrorCode, EntityErrorState } from './EntityError';

export default abstract class EntityCacheAdapterError extends EntityError {}

export class EntityCacheAdapterTransientError extends EntityCacheAdapterError {
  public readonly state = EntityErrorState.TRANSIENT;
  public readonly code = EntityErrorCode.ERR_ENTITY_CACHE_ADAPTER_TRANSIENT;
}

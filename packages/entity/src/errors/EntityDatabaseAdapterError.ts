import EntityError, { EntityErrorCode, EntityErrorState } from './EntityError';

export default abstract class EntityDatabaseAdapterError extends EntityError {}

export class EntityDatabaseAdapterTransientError extends EntityDatabaseAdapterError {
  public readonly state = EntityErrorState.TRANSIENT;
  public readonly code = EntityErrorCode.ERR_ENTITY_DATABASE_ADAPTER_TRANSIENT;
}

export class EntityDatabaseAdapterUnknownError extends EntityDatabaseAdapterError {
  public readonly state = EntityErrorState.UNKNOWN;
  public readonly code = EntityErrorCode.ERR_ENTITY_DATABASE_ADAPTER_UNKNOWN;
}

export class EntityDatabaseAdapterCheckConstraintError extends EntityDatabaseAdapterError {
  public readonly state = EntityErrorState.PERMANENT;
  public readonly code = EntityErrorCode.ERR_ENTITY_DATABASE_ADAPTER_CHECK_CONSTRAINT;
}

export class EntityDatabaseAdapterExclusionConstraintError extends EntityDatabaseAdapterError {
  public readonly state = EntityErrorState.PERMANENT;
  public readonly code = EntityErrorCode.ERR_ENTITY_DATABASE_ADAPTER_EXCLUSION_CONSTRAINT;
}

export class EntityDatabaseAdapterForeignKeyConstraintError extends EntityDatabaseAdapterError {
  public readonly state = EntityErrorState.PERMANENT;
  public readonly code = EntityErrorCode.ERR_ENTITY_DATABASE_ADAPTER_FOREIGN_KEY_CONSTRAINT;
}

export class EntityDatabaseAdapterNotNullConstraintError extends EntityDatabaseAdapterError {
  public readonly state = EntityErrorState.PERMANENT;
  public readonly code = EntityErrorCode.ERR_ENTITY_DATABASE_ADAPTER_NOT_NULL_CONSTRAINT;
}

export class EntityDatabaseAdapterUniqueConstraintError extends EntityDatabaseAdapterError {
  public readonly state = EntityErrorState.PERMANENT;
  public readonly code = EntityErrorCode.ERR_ENTITY_DATABASE_ADAPTER_UNIQUE_CONSTRAINT;
}

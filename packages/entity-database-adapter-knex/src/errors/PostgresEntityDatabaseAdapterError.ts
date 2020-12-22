import { EntityDatabaseAdapterError, EntityErrorState } from '@expo/entity';

export default abstract class PostgresEntityDatabaseAdapterError extends EntityDatabaseAdapterError {
  constructor(public readonly nativeError: Error) {
    super(nativeError.message);
    this.stack = nativeError.stack;
  }
}

export class PostgresEntityDatabaseAdapterTransientError extends PostgresEntityDatabaseAdapterError {
  public readonly state = EntityErrorState.TRANSIENT;
}

export class PostgresEntityDatabaseAdapterUnknownError extends PostgresEntityDatabaseAdapterError {
  public readonly state = EntityErrorState.UNKNOWN;
}

export class PostgresEntityDatabaseAdapterCheckConstraintError extends PostgresEntityDatabaseAdapterError {
  public readonly state = EntityErrorState.PERMANENT;
}

export class PostgresEntityDatabaseAdapterExclusionConstraintError extends PostgresEntityDatabaseAdapterError {
  public readonly state = EntityErrorState.PERMANENT;
}

export class EntityDatabaseAdapterForeignKeyConstraintError extends PostgresEntityDatabaseAdapterError {
  public readonly state = EntityErrorState.PERMANENT;
}

export class PostgresEntityDatabaseAdapterNotNullConstraintError extends PostgresEntityDatabaseAdapterError {
  public readonly state = EntityErrorState.PERMANENT;
}

export class PostgresEntityDatabaseAdapterUniqueConstraintError extends PostgresEntityDatabaseAdapterError {
  public readonly state = EntityErrorState.PERMANENT;
}

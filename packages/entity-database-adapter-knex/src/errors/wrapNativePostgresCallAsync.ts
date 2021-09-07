import {
  EntityDatabaseAdapterError,
  EntityDatabaseAdapterCheckConstraintError,
  EntityDatabaseAdapterExclusionConstraintError,
  EntityDatabaseAdapterForeignKeyConstraintError,
  EntityDatabaseAdapterNotNullConstraintError,
  EntityDatabaseAdapterTransientError,
  EntityDatabaseAdapterUniqueConstraintError,
  EntityDatabaseAdapterUnknownError,
} from '@expo/entity';
import { knex } from 'knex';

function wrapNativePostgresError(
  error: Error & { code?: string }
): EntityDatabaseAdapterError & Error {
  const ret = translatePostgresError(error);
  if (error.stack) {
    ret.stack = error.stack;
  }
  return ret;
}

function translatePostgresError(
  error: Error & { code?: string }
): EntityDatabaseAdapterError & Error {
  if (error instanceof knex.KnexTimeoutError) {
    return new EntityDatabaseAdapterTransientError(error.message, error);
  }

  switch (error.code) {
    case '23502':
      return new EntityDatabaseAdapterNotNullConstraintError(error.message, error);
    case '23503':
      return new EntityDatabaseAdapterForeignKeyConstraintError(error.message, error);
    case '23505':
      return new EntityDatabaseAdapterUniqueConstraintError(error.message, error);
    case '23514':
      return new EntityDatabaseAdapterCheckConstraintError(error.message, error);
    case '23P01':
      return new EntityDatabaseAdapterExclusionConstraintError(error.message, error);
    default:
      return new EntityDatabaseAdapterUnknownError(error.message, error);
  }
}

export default async function wrapNativePostgresCallAsync<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (!(e instanceof Error)) {
      throw e;
    }
    throw wrapNativePostgresError(e);
  }
}

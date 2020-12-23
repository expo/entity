import { EntityDatabaseAdapterError } from '@expo/entity';
import {
  EntityDatabaseAdapterCheckConstraintError,
  EntityDatabaseAdapterExclusionConstraintError,
  EntityDatabaseAdapterForeignKeyConstraintError,
  EntityDatabaseAdapterNotNullConstraintError,
  EntityDatabaseAdapterTransientError,
  EntityDatabaseAdapterUniqueConstraintError,
  EntityDatabaseAdapterUnknownError,
} from '@expo/entity/build/errors/EntityDatabaseAdapterError';
import { KnexTimeoutError } from 'knex';

function wrapNativePostgresError(
  error: Error & { code: string | undefined }
): EntityDatabaseAdapterError & Error {
  const ret = translatePostgresError(error);
  ret.stack = error.stack;
  return ret;
}

function translatePostgresError(
  error: Error & { code: string | undefined }
): EntityDatabaseAdapterError & Error {
  if (error instanceof KnexTimeoutError) {
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

export default async function wrapNativePostgresCall<T>(fn: Promise<T>): Promise<T> {
  try {
    return await fn;
  } catch (e) {
    throw wrapNativePostgresError(e);
  }
}

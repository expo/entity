import { KnexTimeoutError } from 'knex';

import PostgresEntityDatabaseAdapterError, {
  EntityDatabaseAdapterForeignKeyConstraintError,
  PostgresEntityDatabaseAdapterCheckConstraintError,
  PostgresEntityDatabaseAdapterExclusionConstraintError,
  PostgresEntityDatabaseAdapterNotNullConstraintError,
  PostgresEntityDatabaseAdapterTransientError,
  PostgresEntityDatabaseAdapterUniqueConstraintError,
  PostgresEntityDatabaseAdapterUnknownError,
} from './PostgresEntityDatabaseAdapterError';

function wrapNativeError(
  error: Error & { code: string | undefined }
): PostgresEntityDatabaseAdapterError & Error {
  if (error instanceof KnexTimeoutError) {
    return new PostgresEntityDatabaseAdapterTransientError(error);
  }

  switch (error.code) {
    case '23502':
      return new PostgresEntityDatabaseAdapterNotNullConstraintError(error);
    case '23503':
      return new EntityDatabaseAdapterForeignKeyConstraintError(error);
    case '23505':
      return new PostgresEntityDatabaseAdapterUniqueConstraintError(error);
    case '23514':
      return new PostgresEntityDatabaseAdapterCheckConstraintError(error);
    case '23P01':
      return new PostgresEntityDatabaseAdapterExclusionConstraintError(error);
    default:
      return new PostgresEntityDatabaseAdapterUnknownError(error);
  }
}

export default async function wrapNativeCall<T>(fn: Promise<T>): Promise<T> {
  try {
    return await fn;
  } catch (e) {
    throw wrapNativeError(e);
  }
}

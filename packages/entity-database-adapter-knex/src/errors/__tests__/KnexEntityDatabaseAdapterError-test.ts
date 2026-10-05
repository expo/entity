import { EntityDatabaseAdapterError, EntityErrorState } from '@expo/entity';
import { describe, expect, it } from '@jest/globals';

import {
  EntityDatabaseAdapterCheckConstraintError,
  EntityDatabaseAdapterExclusionConstraintError,
  EntityDatabaseAdapterForeignKeyConstraintError,
  EntityDatabaseAdapterNotNullConstraintError,
  EntityDatabaseAdapterPaginationCursorInvalidError,
  EntityDatabaseAdapterTransientError,
  EntityDatabaseAdapterUnknownError,
  KnexEntityDatabaseAdapterErrorCode,
} from '../KnexEntityDatabaseAdapterError.ts';

describe('KnexEntityDatabaseAdapterError', () => {
  it('instantiates all errors with correct state and code', () => {
    const transientError = new EntityDatabaseAdapterTransientError('test');
    expect(transientError).toBeInstanceOf(EntityDatabaseAdapterError);
    expect(transientError.state).toBe(EntityErrorState.TRANSIENT);
    expect(transientError.code).toBe(
      KnexEntityDatabaseAdapterErrorCode.ERR_ENTITY_DATABASE_ADAPTER_TRANSIENT,
    );

    const unknownError = new EntityDatabaseAdapterUnknownError('test');
    expect(unknownError).toBeInstanceOf(EntityDatabaseAdapterError);
    expect(unknownError.state).toBe(EntityErrorState.UNKNOWN);
    expect(unknownError.code).toBe(
      KnexEntityDatabaseAdapterErrorCode.ERR_ENTITY_DATABASE_ADAPTER_UNKNOWN,
    );

    const checkError = new EntityDatabaseAdapterCheckConstraintError('test');
    expect(checkError).toBeInstanceOf(EntityDatabaseAdapterError);
    expect(checkError.state).toBe(EntityErrorState.PERMANENT);
    expect(checkError.code).toBe(
      KnexEntityDatabaseAdapterErrorCode.ERR_ENTITY_DATABASE_ADAPTER_CHECK_CONSTRAINT,
    );

    const exclusionError = new EntityDatabaseAdapterExclusionConstraintError('test');
    expect(exclusionError).toBeInstanceOf(EntityDatabaseAdapterError);
    expect(exclusionError.state).toBe(EntityErrorState.PERMANENT);
    expect(exclusionError.code).toBe(
      KnexEntityDatabaseAdapterErrorCode.ERR_ENTITY_DATABASE_ADAPTER_EXCLUSION_CONSTRAINT,
    );

    const foreignKeyError = new EntityDatabaseAdapterForeignKeyConstraintError('test');
    expect(foreignKeyError).toBeInstanceOf(EntityDatabaseAdapterError);
    expect(foreignKeyError.state).toBe(EntityErrorState.PERMANENT);
    expect(foreignKeyError.code).toBe(
      KnexEntityDatabaseAdapterErrorCode.ERR_ENTITY_DATABASE_ADAPTER_FOREIGN_KEY_CONSTRAINT,
    );

    const notNullError = new EntityDatabaseAdapterNotNullConstraintError('test');
    expect(notNullError).toBeInstanceOf(EntityDatabaseAdapterError);
    expect(notNullError.state).toBe(EntityErrorState.PERMANENT);
    expect(notNullError.code).toBe(
      KnexEntityDatabaseAdapterErrorCode.ERR_ENTITY_DATABASE_ADAPTER_NOT_NULL_CONSTRAINT,
    );

    const paginationCursorInvalidError = new EntityDatabaseAdapterPaginationCursorInvalidError(
      'test',
    );
    expect(paginationCursorInvalidError).toBeInstanceOf(EntityDatabaseAdapterError);
    expect(paginationCursorInvalidError.state).toBe(EntityErrorState.PERMANENT);
    expect(paginationCursorInvalidError.code).toBe(
      KnexEntityDatabaseAdapterErrorCode.ERR_ENTITY_DATABASE_ADAPTER_PAGINATION_CURSOR_INVALID,
    );
  });
});

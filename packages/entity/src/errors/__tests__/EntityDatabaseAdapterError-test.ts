import { describe, expect, it } from '@jest/globals';

import {
  EntityDatabaseAdapterCheckConstraintError,
  EntityDatabaseAdapterEmptyInsertResultError,
  EntityDatabaseAdapterEmptyUpdateResultError,
  EntityDatabaseAdapterError,
  EntityDatabaseAdapterExcessiveDeleteResultError,
  EntityDatabaseAdapterExcessiveInsertResultError,
  EntityDatabaseAdapterExcessiveUpdateResultError,
  EntityDatabaseAdapterExclusionConstraintError,
  EntityDatabaseAdapterForeignKeyConstraintError,
  EntityDatabaseAdapterNotNullConstraintError,
  EntityDatabaseAdapterTransientError,
  EntityDatabaseAdapterUniqueConstraintError,
  EntityDatabaseAdapterUnknownError,
} from '../EntityDatabaseAdapterError';
import { EntityErrorCode, EntityErrorState } from '../EntityError';

describe(EntityDatabaseAdapterError, () => {
  // necessary for coverage within the entity package since these errors are
  // currently only ever instantiated by database adapter implementations
  it('instantiates all errors with correct state and code', () => {
    const transientError = new EntityDatabaseAdapterTransientError('test');
    expect(transientError.state).toBe(EntityErrorState.TRANSIENT);
    expect(transientError.code).toBe(EntityErrorCode.ERR_ENTITY_DATABASE_ADAPTER_TRANSIENT);

    const unknownError = new EntityDatabaseAdapterUnknownError('test');
    expect(unknownError.state).toBe(EntityErrorState.UNKNOWN);
    expect(unknownError.code).toBe(EntityErrorCode.ERR_ENTITY_DATABASE_ADAPTER_UNKNOWN);

    const checkError = new EntityDatabaseAdapterCheckConstraintError('test');
    expect(checkError.state).toBe(EntityErrorState.PERMANENT);
    expect(checkError.code).toBe(EntityErrorCode.ERR_ENTITY_DATABASE_ADAPTER_CHECK_CONSTRAINT);

    const exclusionError = new EntityDatabaseAdapterExclusionConstraintError('test');
    expect(exclusionError.state).toBe(EntityErrorState.PERMANENT);
    expect(exclusionError.code).toBe(
      EntityErrorCode.ERR_ENTITY_DATABASE_ADAPTER_EXCLUSION_CONSTRAINT,
    );

    const foreignKeyError = new EntityDatabaseAdapterForeignKeyConstraintError('test');
    expect(foreignKeyError.state).toBe(EntityErrorState.PERMANENT);
    expect(foreignKeyError.code).toBe(
      EntityErrorCode.ERR_ENTITY_DATABASE_ADAPTER_FOREIGN_KEY_CONSTRAINT,
    );

    const notNullError = new EntityDatabaseAdapterNotNullConstraintError('test');
    expect(notNullError.state).toBe(EntityErrorState.PERMANENT);
    expect(notNullError.code).toBe(EntityErrorCode.ERR_ENTITY_DATABASE_ADAPTER_NOT_NULL_CONSTRAINT);

    const uniqueError = new EntityDatabaseAdapterUniqueConstraintError('test');
    expect(uniqueError.state).toBe(EntityErrorState.PERMANENT);
    expect(uniqueError.code).toBe(EntityErrorCode.ERR_ENTITY_DATABASE_ADAPTER_UNIQUE_CONSTRAINT);

    const excessiveInsertError = new EntityDatabaseAdapterExcessiveInsertResultError('test');
    expect(excessiveInsertError.state).toBe(EntityErrorState.PERMANENT);
    expect(excessiveInsertError.code).toBe(
      EntityErrorCode.ERR_ENTITY_DATABASE_ADAPTER_EXCESSIVE_INSERT_RESULT,
    );

    const emptyInsertError = new EntityDatabaseAdapterEmptyInsertResultError('test');
    expect(emptyInsertError.state).toBe(EntityErrorState.PERMANENT);
    expect(emptyInsertError.code).toBe(
      EntityErrorCode.ERR_ENTITY_DATABASE_ADAPTER_EMPTY_INSERT_RESULT,
    );

    const excessiveUpdateError = new EntityDatabaseAdapterExcessiveUpdateResultError('test');
    expect(excessiveUpdateError.state).toBe(EntityErrorState.PERMANENT);
    expect(excessiveUpdateError.code).toBe(
      EntityErrorCode.ERR_ENTITY_DATABASE_ADAPTER_EXCESSIVE_UPDATE_RESULT,
    );

    const emptyUpdateError = new EntityDatabaseAdapterEmptyUpdateResultError('test');
    expect(emptyUpdateError.state).toBe(EntityErrorState.PERMANENT);
    expect(emptyUpdateError.code).toBe(
      EntityErrorCode.ERR_ENTITY_DATABASE_ADAPTER_EMPTY_UPDATE_RESULT,
    );

    const excessiveDeleteError = new EntityDatabaseAdapterExcessiveDeleteResultError('test');
    expect(excessiveDeleteError.state).toBe(EntityErrorState.PERMANENT);
    expect(excessiveDeleteError.code).toBe(
      EntityErrorCode.ERR_ENTITY_DATABASE_ADAPTER_EXCESSIVE_DELETE_RESULT,
    );
  });
});

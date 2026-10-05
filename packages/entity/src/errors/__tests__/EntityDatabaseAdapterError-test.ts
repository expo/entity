import { describe, expect, it } from '@jest/globals';

import {
  EntityDatabaseAdapterEmptyInsertResultError,
  EntityDatabaseAdapterEmptyUpdateResultError,
  EntityDatabaseAdapterError,
  EntityDatabaseAdapterExcessiveDeleteResultError,
  EntityDatabaseAdapterExcessiveInsertResultError,
  EntityDatabaseAdapterExcessiveUpdateResultError,
  EntityDatabaseAdapterUniqueConstraintError,
} from '../EntityDatabaseAdapterError.ts';
import { EntityErrorCode, EntityErrorState } from '../EntityError.ts';

describe(EntityDatabaseAdapterError, () => {
  // necessary for coverage within the entity package since these errors are
  // currently only ever instantiated by database adapter implementations
  it('instantiates all errors with correct state and code', () => {
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

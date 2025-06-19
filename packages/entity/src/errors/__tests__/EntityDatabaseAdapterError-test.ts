import { describe, expect, it } from '@jest/globals';

import {
  EntityDatabaseAdapterCheckConstraintError,
  EntityDatabaseAdapterError,
  EntityDatabaseAdapterExclusionConstraintError,
  EntityDatabaseAdapterForeignKeyConstraintError,
  EntityDatabaseAdapterNotNullConstraintError,
  EntityDatabaseAdapterTransientError,
  EntityDatabaseAdapterUniqueConstraintError,
  EntityDatabaseAdapterUnknownError,
} from '../EntityDatabaseAdapterError';

describe(EntityDatabaseAdapterError, () => {
  // necessary for coverage within the entity package since these errors are
  // currently only ever instantiated by database adapter implementations
  it('instantiates all errors successfully', () => {
    const errors = [
      new EntityDatabaseAdapterTransientError('test'),
      new EntityDatabaseAdapterUnknownError('test'),
      new EntityDatabaseAdapterCheckConstraintError('test'),
      new EntityDatabaseAdapterExclusionConstraintError('test'),
      new EntityDatabaseAdapterForeignKeyConstraintError('test'),
      new EntityDatabaseAdapterNotNullConstraintError('test'),
      new EntityDatabaseAdapterUniqueConstraintError('test'),
    ];
    expect(errors).not.toBeFalsy();
  });
});

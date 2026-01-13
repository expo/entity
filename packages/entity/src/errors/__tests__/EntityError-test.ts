import { describe, expect, it } from '@jest/globals';

import { EntityCacheAdapterTransientError } from '../EntityCacheAdapterError';
import { EntityErrorCode, EntityErrorState } from '../EntityError';
import { EntityInvalidFieldValueError } from '../EntityInvalidFieldValueError';
import { EntityNotAuthorizedError } from '../EntityNotAuthorizedError';
import { EntityNotFoundError } from '../EntityNotFoundError';

describe('EntityError subclasses', () => {
  it('EntityNotFoundError has correct state and code', () => {
    const error = new EntityNotFoundError('not found');
    expect(error.state).toBe(EntityErrorState.PERMANENT);
    expect(error.code).toBe(EntityErrorCode.ERR_ENTITY_NOT_FOUND);
  });

  it('EntityNotAuthorizedError has correct state and code', () => {
    const mockEntity = { constructor: { name: 'TestEntity' }, toString: () => 'TestEntity' } as any;
    const mockViewerContext = { toString: () => 'TestViewer' } as any;
    const error = new EntityNotAuthorizedError(mockEntity, mockViewerContext, 0, 0);
    expect(error.state).toBe(EntityErrorState.PERMANENT);
    expect(error.code).toBe(EntityErrorCode.ERR_ENTITY_NOT_AUTHORIZED);
  });

  it('EntityInvalidFieldValueError has correct state and code', () => {
    const mockEntityClass = { name: 'TestEntity' } as any;
    const error = new EntityInvalidFieldValueError(mockEntityClass, 'testField', 'badValue');
    expect(error.state).toBe(EntityErrorState.PERMANENT);
    expect(error.code).toBe(EntityErrorCode.ERR_ENTITY_INVALID_FIELD_VALUE);
  });

  it('EntityCacheAdapterTransientError has correct state and code', () => {
    const error = new EntityCacheAdapterTransientError('cache error');
    expect(error.state).toBe(EntityErrorState.TRANSIENT);
    expect(error.code).toBe(EntityErrorCode.ERR_ENTITY_CACHE_ADAPTER_TRANSIENT);
  });
});

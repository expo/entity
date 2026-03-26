import { describe, expect, it } from '@jest/globals';
import { instance, mock } from 'ts-mockito';

import { ViewerContext } from '../../ViewerContext.ts';
import { SimpleTestEntity } from '../../utils/__testfixtures__/SimpleTestEntity.ts';
import { EntityCacheAdapterTransientError } from '../EntityCacheAdapterError.ts';
import { EntityErrorCode, EntityErrorState } from '../EntityError.ts';
import { EntityInvalidFieldValueError } from '../EntityInvalidFieldValueError.ts';
import { EntityNotAuthorizedError } from '../EntityNotAuthorizedError.ts';
import { EntityNotFoundError } from '../EntityNotFoundError.ts';

describe('EntityError subclasses', () => {
  it('EntityNotFoundError has correct state and code', () => {
    const error = new EntityNotFoundError('not found');
    expect(error.state).toBe(EntityErrorState.PERMANENT);
    expect(error.code).toBe(EntityErrorCode.ERR_ENTITY_NOT_FOUND);
  });

  it('EntityNotAuthorizedError has correct state and code', () => {
    const viewerContext = instance(mock(ViewerContext));
    const data = { id: '1' };
    const testEntity = new SimpleTestEntity({
      viewerContext,
      id: 'what',
      databaseFields: data,
      selectedFields: data,
    });
    const error = new EntityNotAuthorizedError(testEntity, viewerContext, 0, 0);
    expect(error.state).toBe(EntityErrorState.PERMANENT);
    expect(error.code).toBe(EntityErrorCode.ERR_ENTITY_NOT_AUTHORIZED);
  });

  it('EntityInvalidFieldValueError has correct state and code', () => {
    const error = new EntityInvalidFieldValueError(SimpleTestEntity, 'id', 'badValue');
    expect(error.state).toBe(EntityErrorState.PERMANENT);
    expect(error.code).toBe(EntityErrorCode.ERR_ENTITY_INVALID_FIELD_VALUE);
    expect(error.fieldName).toBe('id');
    expect(error.fieldValue).toBe('badValue');
  });

  it('EntityCacheAdapterTransientError has correct state and code', () => {
    const error = new EntityCacheAdapterTransientError('cache error');
    expect(error.state).toBe(EntityErrorState.TRANSIENT);
    expect(error.code).toBe(EntityErrorCode.ERR_ENTITY_CACHE_ADAPTER_TRANSIENT);
  });
});

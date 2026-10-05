import { EntityErrorState } from '@expo/entity';
import { describe, expect, it } from '@jest/globals';

import { EntityDatabaseAdapterLockNotAvailableError } from '../KnexEntityDatabaseAdapterError.ts';
import { wrapNativePostgresCallAsync } from '../wrapNativePostgresCallAsync.ts';

describe(wrapNativePostgresCallAsync, () => {
  it('translates a PostgreSQL lock_not_available error and preserves the cause', async () => {
    const error = Object.assign(new Error('canceling statement due to lock timeout'), {
      code: '55P03',
    });
    const result = wrapNativePostgresCallAsync(async () => {
      throw error;
    });

    await expect(result).rejects.toBeInstanceOf(EntityDatabaseAdapterLockNotAvailableError);
    await expect(result).rejects.toMatchObject({
      state: EntityErrorState.TRANSIENT,
      message: error.message,
      stack: error.stack,
      cause: error,
    });
  });

  it('rethrows literals', async () => {
    const throwingFn = async (): Promise<void> => {
      // eslint-disable-next-line no-throw-literal,@typescript-eslint/only-throw-error
      throw 'hello';
    };

    let capturedThrownThing: any;
    try {
      await wrapNativePostgresCallAsync(throwingFn);
    } catch (e) {
      capturedThrownThing = e;
    }
    expect(capturedThrownThing).not.toBeInstanceOf(Error);
    expect(capturedThrownThing).toEqual('hello');
  });
});

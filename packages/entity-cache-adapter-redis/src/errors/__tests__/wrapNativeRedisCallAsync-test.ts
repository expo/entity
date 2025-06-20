import { EntityCacheAdapterTransientError } from '@expo/entity';
import { describe, expect, it } from '@jest/globals';

import wrapNativeRedisCallAsync from '../wrapNativeRedisCallAsync';

describe(wrapNativeRedisCallAsync, () => {
  it('rethrows literals', async () => {
    const throwingFn = async (): Promise<void> => {
      // eslint-disable-next-line no-throw-literal,@typescript-eslint/only-throw-error
      throw 'hello';
    };

    let capturedThrownThing: any;
    try {
      await wrapNativeRedisCallAsync(throwingFn);
    } catch (e) {
      capturedThrownThing = e;
    }
    expect(capturedThrownThing).not.toBeInstanceOf(Error);
    expect(capturedThrownThing).toEqual('hello');
  });

  it('wraps errors with stacks', async () => {
    const throwingFn = async (): Promise<void> => {
      const e = new Error('hello');
      e.stack = 'world';
      throw e;
    };

    let capturedThrownThing: any;
    try {
      await wrapNativeRedisCallAsync(throwingFn);
    } catch (e) {
      capturedThrownThing = e;
    }
    expect(capturedThrownThing).toBeInstanceOf(EntityCacheAdapterTransientError);
    expect(capturedThrownThing.message).toEqual('hello');
    expect(capturedThrownThing.stack).toEqual('world');
  });
});

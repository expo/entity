import { EntityCacheAdapterTransientError } from '@expo/entity';

export default async function wrapNativeRedisCallAsync<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (!(e instanceof Error)) {
      throw e;
    }

    const error = new EntityCacheAdapterTransientError(e.message, e);
    if (e.stack) {
      error.stack = e.stack;
    }
    throw error;
  }
}

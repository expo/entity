import { EntityCacheAdapterTransientError } from '@expo/entity';

export default async function wrapNativeRedisCall<T>(fn: Promise<T>): Promise<T> {
  try {
    return await fn;
  } catch (e) {
    const error = new EntityCacheAdapterTransientError(e.message, e);
    error.stack = e.stack;
    throw error;
  }
}

import GenericLocalMemoryCacher from '../GenericLocalMemoryCacher';

describe(GenericLocalMemoryCacher, () => {
  describe(GenericLocalMemoryCacher.createLRUCache, () => {
    it('creates a cache with default options', () => {
      const cache = GenericLocalMemoryCacher.createLRUCache();
      expect(cache.max).toBe(10000);
      expect(cache.maxSize).toBe(10000);
      expect(cache.ttl).toBe(10000);
    });

    it('respects specified options', () => {
      const cache = GenericLocalMemoryCacher.createLRUCache({
        ttlSeconds: 3,
        maxSize: 10,
      });
      expect(cache.max).toBe(10);
      expect(cache.maxSize).toBe(10);
      expect(cache.ttl).toBe(3000);
    });
  });

  describe(GenericLocalMemoryCacher.createNoOpCache, () => {
    it('creates a no-op cache', () => {
      const cache = GenericLocalMemoryCacher.createNoOpCache<{ hello: 'world' }>();
      cache.set('a', { hello: 'world' });
      expect(cache.get('a')).toBeUndefined();
    });
  });
});

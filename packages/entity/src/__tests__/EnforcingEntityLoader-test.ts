import { result } from '@expo/results';
import { mock, instance, when, anything } from 'ts-mockito';

import EnforcingEntityLoader from '../EnforcingEntityLoader';
import EntityLoader from '../EntityLoader';

describe(EnforcingEntityLoader, () => {
  describe('loadManyByFieldEqualingManyAsync', () => {
    it('throws when result is unsuccessful', async () => {
      const entityLoaderMock = mock<EntityLoader<any, any, any, any, any, any>>(EntityLoader);
      const rejection = new Error();
      when(entityLoaderMock.loadManyByFieldEqualingManyAsync(anything(), anything())).thenResolve(
        new Map(
          Object.entries({
            hello: [result(rejection)],
          })
        )
      );
      const entityLoader = instance(entityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(entityLoader);
      await expect(
        enforcingEntityLoader.loadManyByFieldEqualingManyAsync(anything(), anything())
      ).rejects.toThrow(rejection);
    });

    it('returns value when result is successful', async () => {
      const entityLoaderMock = mock<EntityLoader<any, any, any, any, any, any>>(EntityLoader);
      const resolved = {};
      when(entityLoaderMock.loadManyByFieldEqualingManyAsync(anything(), anything())).thenResolve(
        new Map(
          Object.entries({
            hello: [result(resolved)],
          })
        )
      );
      const entityLoader = instance(entityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(entityLoader);
      await expect(
        enforcingEntityLoader.loadManyByFieldEqualingManyAsync(anything(), anything())
      ).resolves.toEqual(
        new Map(
          Object.entries({
            hello: [resolved],
          })
        )
      );
    });
  });

  describe('loadManyByFieldEqualingAsync', () => {
    it('throws when result is unsuccessful', async () => {
      const entityLoaderMock = mock<EntityLoader<any, any, any, any, any, any>>(EntityLoader);
      const rejection = new Error();
      when(entityLoaderMock.loadManyByFieldEqualingAsync(anything(), anything())).thenResolve([
        result(rejection),
      ]);
      const entityLoader = instance(entityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(entityLoader);
      await expect(
        enforcingEntityLoader.loadManyByFieldEqualingAsync(anything(), anything())
      ).rejects.toThrow(rejection);
    });

    it('returns value when result is successful', async () => {
      const entityLoaderMock = mock<EntityLoader<any, any, any, any, any, any>>(EntityLoader);
      const resolved = {};
      when(entityLoaderMock.loadManyByFieldEqualingAsync(anything(), anything())).thenResolve([
        result(resolved),
      ]);
      const entityLoader = instance(entityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(entityLoader);
      await expect(
        enforcingEntityLoader.loadManyByFieldEqualingAsync(anything(), anything())
      ).resolves.toEqual([resolved]);
    });
  });

  describe('loadByFieldEqualingAsync', () => {
    it('throws when result is unsuccessful', async () => {
      const entityLoaderMock = mock<EntityLoader<any, any, any, any, any, any>>(EntityLoader);
      const rejection = new Error();
      when(entityLoaderMock.loadByFieldEqualingAsync(anything(), anything())).thenResolve(
        result(rejection)
      );
      const entityLoader = instance(entityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(entityLoader);
      await expect(
        enforcingEntityLoader.loadByFieldEqualingAsync(anything(), anything())
      ).rejects.toThrow(rejection);
    });

    it('returns value when result is successful', async () => {
      const entityLoaderMock = mock<EntityLoader<any, any, any, any, any, any>>(EntityLoader);
      const resolved = {};
      when(entityLoaderMock.loadByFieldEqualingAsync(anything(), anything())).thenResolve(
        result(resolved)
      );
      const entityLoader = instance(entityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(entityLoader);
      await expect(
        enforcingEntityLoader.loadByFieldEqualingAsync(anything(), anything())
      ).resolves.toEqual(resolved);
    });

    it('returns null when result is successful and no entity is found', async () => {
      const entityLoaderMock = mock<EntityLoader<any, any, any, any, any, any>>(EntityLoader);
      const resolved = null;
      when(entityLoaderMock.loadByFieldEqualingAsync(anything(), anything())).thenResolve(
        result(resolved)
      );
      const entityLoader = instance(entityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(entityLoader);
      await expect(
        enforcingEntityLoader.loadByFieldEqualingAsync(anything(), anything())
      ).resolves.toEqual(resolved);
    });

    it('throws when multiple matching entities are found', async () => {
      const entityLoaderMock = mock<EntityLoader<any, any, any, any, any, any>>(EntityLoader);
      const multipleEntitiesError = new Error();
      when(entityLoaderMock.loadByFieldEqualingAsync(anything(), anything())).thenReject(
        multipleEntitiesError
      );
      const entityLoader = instance(entityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(entityLoader);
      await expect(
        enforcingEntityLoader.loadByFieldEqualingAsync(anything(), anything())
      ).rejects.toEqual(multipleEntitiesError);
    });
  });

  describe('loadByIDAsync', () => {
    it('throws when result is unsuccessful', async () => {
      const entityLoaderMock = mock<EntityLoader<any, any, any, any, any, any>>(EntityLoader);
      const rejection = new Error();
      when(entityLoaderMock.loadByIDAsync(anything())).thenResolve(result(rejection));
      const entityLoader = instance(entityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(entityLoader);
      await expect(enforcingEntityLoader.loadByIDAsync(anything())).rejects.toThrow(rejection);
    });

    it('returns value when result is successful', async () => {
      const entityLoaderMock = mock<EntityLoader<any, any, any, any, any, any>>(EntityLoader);
      const resolved = {};
      when(entityLoaderMock.loadByIDAsync(anything())).thenResolve(result(resolved));
      const entityLoader = instance(entityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(entityLoader);
      await expect(enforcingEntityLoader.loadByIDAsync(anything())).resolves.toEqual(resolved);
    });
  });

  describe('loadByIDNullableAsync', () => {
    it('throws when result is unsuccessful', async () => {
      const entityLoaderMock = mock<EntityLoader<any, any, any, any, any, any>>(EntityLoader);
      const rejection = new Error();
      when(entityLoaderMock.loadByIDNullableAsync(anything())).thenResolve(result(rejection));
      const entityLoader = instance(entityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(entityLoader);
      await expect(enforcingEntityLoader.loadByIDNullableAsync(anything())).rejects.toThrow(
        rejection
      );
    });

    it('returns value when result is successful', async () => {
      const entityLoaderMock = mock<EntityLoader<any, any, any, any, any, any>>(EntityLoader);
      const resolved = {};
      when(entityLoaderMock.loadByIDNullableAsync(anything())).thenResolve(result(resolved));
      const entityLoader = instance(entityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(entityLoader);
      await expect(enforcingEntityLoader.loadByIDNullableAsync(anything())).resolves.toEqual(
        resolved
      );
    });

    it('returns null when non-existent object', async () => {
      const entityLoaderMock = mock<EntityLoader<any, any, any, any, any, any>>(EntityLoader);
      const resolved = null;
      when(entityLoaderMock.loadByIDNullableAsync(anything())).thenResolve(result(resolved));
      const entityLoader = instance(entityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(entityLoader);
      await expect(enforcingEntityLoader.loadByIDNullableAsync(anything())).resolves.toEqual(
        resolved
      );
    });
  });

  describe('loadManyByIDsAsync', () => {
    it('throws when result is unsuccessful', async () => {
      const entityLoaderMock = mock<EntityLoader<any, any, any, any, any, any>>(EntityLoader);
      const rejection = new Error();
      when(entityLoaderMock.loadManyByIDsAsync(anything())).thenResolve(
        new Map(
          Object.entries({
            hello: result(rejection),
          })
        )
      );
      const entityLoader = instance(entityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(entityLoader);
      await expect(enforcingEntityLoader.loadManyByIDsAsync(anything())).rejects.toThrow(rejection);
    });

    it('returns value when result is successful', async () => {
      const entityLoaderMock = mock<EntityLoader<any, any, any, any, any, any>>(EntityLoader);
      const resolved = {};
      when(entityLoaderMock.loadManyByIDsAsync(anything())).thenResolve(
        new Map(
          Object.entries({
            hello: result(resolved),
          })
        )
      );
      const entityLoader = instance(entityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(entityLoader);
      await expect(enforcingEntityLoader.loadManyByIDsAsync(anything())).resolves.toEqual(
        new Map(
          Object.entries({
            hello: resolved,
          })
        )
      );
    });
  });

  describe('loadManyByIDsNullableAsync', () => {
    it('throws when result is unsuccessful even when there is a null result', async () => {
      const entityLoaderMock = mock<EntityLoader<any, any, any, any, any, any>>(EntityLoader);
      const rejection = new Error();
      when(entityLoaderMock.loadManyByIDsNullableAsync(anything())).thenResolve(
        new Map(
          Object.entries({
            hello: result(rejection),
            world: null,
          })
        )
      );
      const entityLoader = instance(entityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(entityLoader);
      await expect(enforcingEntityLoader.loadManyByIDsNullableAsync(anything())).rejects.toThrow(
        rejection
      );
    });

    it('returns value when result is successful', async () => {
      const entityLoaderMock = mock<EntityLoader<any, any, any, any, any, any>>(EntityLoader);
      const resolved = {};
      when(entityLoaderMock.loadManyByIDsNullableAsync(anything())).thenResolve(
        new Map(
          Object.entries({
            hello: result(resolved),
            world: null,
          })
        )
      );
      const entityLoader = instance(entityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(entityLoader);
      await expect(enforcingEntityLoader.loadManyByIDsNullableAsync(anything())).resolves.toEqual(
        new Map(
          Object.entries({
            hello: resolved,
            world: null,
          })
        )
      );
    });
  });

  describe('loadFirstByFieldEqualityConjunction', () => {
    it('throws when result is unsuccessful', async () => {
      const entityLoaderMock = mock<EntityLoader<any, any, any, any, any, any>>(EntityLoader);
      const rejection = new Error();
      when(
        entityLoaderMock.loadFirstByFieldEqualityConjunctionAsync(anything(), anything())
      ).thenResolve(result(rejection));
      const entityLoader = instance(entityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(entityLoader);
      await expect(
        enforcingEntityLoader.loadFirstByFieldEqualityConjunctionAsync(anything(), anything())
      ).rejects.toThrow(rejection);
    });

    it('returns value when result is successful', async () => {
      const entityLoaderMock = mock<EntityLoader<any, any, any, any, any, any>>(EntityLoader);
      const resolved = {};
      when(
        entityLoaderMock.loadFirstByFieldEqualityConjunctionAsync(anything(), anything())
      ).thenResolve(result(resolved));
      const entityLoader = instance(entityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(entityLoader);
      await expect(
        enforcingEntityLoader.loadFirstByFieldEqualityConjunctionAsync(anything(), anything())
      ).resolves.toEqual(resolved);
    });

    it('returns null when the query is successful but no rows match', async () => {
      const entityLoaderMock = mock<EntityLoader<any, any, any, any, any, any>>(EntityLoader);
      when(
        entityLoaderMock.loadFirstByFieldEqualityConjunctionAsync(anything(), anything())
      ).thenResolve(null);
      const entityLoader = instance(entityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(entityLoader);
      await expect(
        enforcingEntityLoader.loadFirstByFieldEqualityConjunctionAsync(anything(), anything())
      ).resolves.toBeNull();
    });
  });

  describe('loadManyByFieldEqualityConjunction', () => {
    it('throws when result is unsuccessful', async () => {
      const entityLoaderMock = mock<EntityLoader<any, any, any, any, any, any>>(EntityLoader);
      const rejection = new Error();
      when(
        entityLoaderMock.loadManyByFieldEqualityConjunctionAsync(anything(), anything())
      ).thenResolve([result(rejection)]);
      const entityLoader = instance(entityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(entityLoader);
      await expect(
        enforcingEntityLoader.loadManyByFieldEqualityConjunctionAsync(anything(), anything())
      ).rejects.toThrow(rejection);
    });

    it('returns value when result is successful', async () => {
      const entityLoaderMock = mock<EntityLoader<any, any, any, any, any, any>>(EntityLoader);
      const resolved = {};
      when(
        entityLoaderMock.loadManyByFieldEqualityConjunctionAsync(anything(), anything())
      ).thenResolve([result(resolved)]);
      const entityLoader = instance(entityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(entityLoader);
      await expect(
        enforcingEntityLoader.loadManyByFieldEqualityConjunctionAsync(anything(), anything())
      ).resolves.toEqual([resolved]);
    });
  });

  describe('loadManyByRawWhereClause', () => {
    it('throws when result is unsuccessful', async () => {
      const entityLoaderMock = mock<EntityLoader<any, any, any, any, any, any>>(EntityLoader);
      const rejection = new Error();
      when(
        entityLoaderMock.loadManyByRawWhereClauseAsync(anything(), anything(), anything())
      ).thenResolve([result(rejection)]);
      const entityLoader = instance(entityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(entityLoader);
      await expect(
        enforcingEntityLoader.loadManyByRawWhereClauseAsync(anything(), anything(), anything())
      ).rejects.toThrow(rejection);
    });

    it('returns value when result is successful', async () => {
      const entityLoaderMock = mock<EntityLoader<any, any, any, any, any, any>>(EntityLoader);
      const resolved = {};
      when(
        entityLoaderMock.loadManyByRawWhereClauseAsync(anything(), anything(), anything())
      ).thenResolve([result(resolved)]);
      const entityLoader = instance(entityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(entityLoader);
      await expect(
        enforcingEntityLoader.loadManyByRawWhereClauseAsync(anything(), anything(), anything())
      ).resolves.toEqual([resolved]);
    });
  });

  it('has the same method names as EntityLoader', () => {
    const enforcingLoaderProperties = Object.getOwnPropertyNames(EnforcingEntityLoader.prototype);
    const loaderProperties = Object.getOwnPropertyNames(EntityLoader.prototype);

    // ensure known differences still exist for sanity check
    const knownLoaderOnlyDifferences = [
      'enforcing',
      'invalidateFieldsAsync',
      'invalidateEntityAsync',
      'tryConstructEntities',
      'validateFieldValues',
      'constructAndAuthorizeEntitiesAsync',
      'constructAndAuthorizeEntitiesArrayAsync',
      'constructEntity',
    ];
    expect(loaderProperties).toEqual(expect.arrayContaining(knownLoaderOnlyDifferences));

    const loaderPropertiesWithoutKnownDifferences = loaderProperties.filter(
      (p) => !knownLoaderOnlyDifferences.includes(p)
    );

    expect(enforcingLoaderProperties).toEqual(loaderPropertiesWithoutKnownDifferences);
  });
});

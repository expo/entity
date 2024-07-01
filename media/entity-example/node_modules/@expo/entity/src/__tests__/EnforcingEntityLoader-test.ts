import { result } from '@expo/results';
import { mock, instance, when, anything } from 'ts-mockito';

import AuthorizationResultBasedEntityLoader from '../AuthorizationResultBasedEntityLoader';
import EnforcingEntityLoader from '../EnforcingEntityLoader';

describe(EnforcingEntityLoader, () => {
  describe('loadManyByFieldEqualingManyAsync', () => {
    it('throws when result is unsuccessful', async () => {
      const nonEnforcingEntityLoaderMock = mock<
        AuthorizationResultBasedEntityLoader<any, any, any, any, any, any>
      >(AuthorizationResultBasedEntityLoader);
      const rejection = new Error();
      when(
        nonEnforcingEntityLoaderMock.loadManyByFieldEqualingManyAsync(anything(), anything()),
      ).thenResolve(
        new Map(
          Object.entries({
            hello: [result(rejection)],
          }),
        ),
      );
      const nonEnforcingEntityLoader = instance(nonEnforcingEntityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(nonEnforcingEntityLoader);
      await expect(
        enforcingEntityLoader.loadManyByFieldEqualingManyAsync(anything(), anything()),
      ).rejects.toThrow(rejection);
    });

    it('returns value when result is successful', async () => {
      const nonEnforcingEntityLoaderMock = mock<
        AuthorizationResultBasedEntityLoader<any, any, any, any, any, any>
      >(AuthorizationResultBasedEntityLoader);
      const resolved = {};
      when(
        nonEnforcingEntityLoaderMock.loadManyByFieldEqualingManyAsync(anything(), anything()),
      ).thenResolve(
        new Map(
          Object.entries({
            hello: [result(resolved)],
          }),
        ),
      );
      const nonEnforcingEntityLoader = instance(nonEnforcingEntityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(nonEnforcingEntityLoader);
      await expect(
        enforcingEntityLoader.loadManyByFieldEqualingManyAsync(anything(), anything()),
      ).resolves.toEqual(
        new Map(
          Object.entries({
            hello: [resolved],
          }),
        ),
      );
    });
  });

  describe('loadManyByFieldEqualingAsync', () => {
    it('throws when result is unsuccessful', async () => {
      const nonEnforcingEntityLoaderMock = mock<
        AuthorizationResultBasedEntityLoader<any, any, any, any, any, any>
      >(AuthorizationResultBasedEntityLoader);
      const rejection = new Error();
      when(
        nonEnforcingEntityLoaderMock.loadManyByFieldEqualingAsync(anything(), anything()),
      ).thenResolve([result(rejection)]);
      const nonEnforcingEntityLoader = instance(nonEnforcingEntityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(nonEnforcingEntityLoader);
      await expect(
        enforcingEntityLoader.loadManyByFieldEqualingAsync(anything(), anything()),
      ).rejects.toThrow(rejection);
    });

    it('returns value when result is successful', async () => {
      const nonEnforcingEntityLoaderMock = mock<
        AuthorizationResultBasedEntityLoader<any, any, any, any, any, any>
      >(AuthorizationResultBasedEntityLoader);
      const resolved = {};
      when(
        nonEnforcingEntityLoaderMock.loadManyByFieldEqualingAsync(anything(), anything()),
      ).thenResolve([result(resolved)]);
      const nonEnforcingEntityLoader = instance(nonEnforcingEntityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(nonEnforcingEntityLoader);
      await expect(
        enforcingEntityLoader.loadManyByFieldEqualingAsync(anything(), anything()),
      ).resolves.toEqual([resolved]);
    });
  });

  describe('loadByFieldEqualingAsync', () => {
    it('throws when result is unsuccessful', async () => {
      const nonEnforcingEntityLoaderMock = mock<
        AuthorizationResultBasedEntityLoader<any, any, any, any, any, any>
      >(AuthorizationResultBasedEntityLoader);
      const rejection = new Error();
      when(
        nonEnforcingEntityLoaderMock.loadByFieldEqualingAsync(anything(), anything()),
      ).thenResolve(result(rejection));
      const nonEnforcingEntityLoader = instance(nonEnforcingEntityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(nonEnforcingEntityLoader);
      await expect(
        enforcingEntityLoader.loadByFieldEqualingAsync(anything(), anything()),
      ).rejects.toThrow(rejection);
    });

    it('returns value when result is successful', async () => {
      const nonEnforcingEntityLoaderMock = mock<
        AuthorizationResultBasedEntityLoader<any, any, any, any, any, any>
      >(AuthorizationResultBasedEntityLoader);
      const resolved = {};
      when(
        nonEnforcingEntityLoaderMock.loadByFieldEqualingAsync(anything(), anything()),
      ).thenResolve(result(resolved));
      const nonEnforcingEntityLoader = instance(nonEnforcingEntityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(nonEnforcingEntityLoader);
      await expect(
        enforcingEntityLoader.loadByFieldEqualingAsync(anything(), anything()),
      ).resolves.toEqual(resolved);
    });

    it('returns null when result is successful and no entity is found', async () => {
      const nonEnforcingEntityLoaderMock = mock<
        AuthorizationResultBasedEntityLoader<any, any, any, any, any, any>
      >(AuthorizationResultBasedEntityLoader);
      const resolved = null;
      when(
        nonEnforcingEntityLoaderMock.loadByFieldEqualingAsync(anything(), anything()),
      ).thenResolve(result(resolved));
      const nonEnforcingEntityLoader = instance(nonEnforcingEntityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(nonEnforcingEntityLoader);
      await expect(
        enforcingEntityLoader.loadByFieldEqualingAsync(anything(), anything()),
      ).resolves.toEqual(resolved);
    });

    it('throws when multiple matching entities are found', async () => {
      const nonEnforcingEntityLoaderMock = mock<
        AuthorizationResultBasedEntityLoader<any, any, any, any, any, any>
      >(AuthorizationResultBasedEntityLoader);
      const multipleEntitiesError = new Error();
      when(
        nonEnforcingEntityLoaderMock.loadByFieldEqualingAsync(anything(), anything()),
      ).thenReject(multipleEntitiesError);
      const nonEnforcingEntityLoader = instance(nonEnforcingEntityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(nonEnforcingEntityLoader);
      await expect(
        enforcingEntityLoader.loadByFieldEqualingAsync(anything(), anything()),
      ).rejects.toEqual(multipleEntitiesError);
    });
  });

  describe('loadByIDAsync', () => {
    it('throws when result is unsuccessful', async () => {
      const nonEnforcingEntityLoaderMock = mock<
        AuthorizationResultBasedEntityLoader<any, any, any, any, any, any>
      >(AuthorizationResultBasedEntityLoader);
      const rejection = new Error();
      when(nonEnforcingEntityLoaderMock.loadByIDAsync(anything())).thenResolve(result(rejection));
      const nonEnforcingEntityLoader = instance(nonEnforcingEntityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(nonEnforcingEntityLoader);
      await expect(enforcingEntityLoader.loadByIDAsync(anything())).rejects.toThrow(rejection);
    });

    it('returns value when result is successful', async () => {
      const nonEnforcingEntityLoaderMock = mock<
        AuthorizationResultBasedEntityLoader<any, any, any, any, any, any>
      >(AuthorizationResultBasedEntityLoader);
      const resolved = {};
      when(nonEnforcingEntityLoaderMock.loadByIDAsync(anything())).thenResolve(result(resolved));
      const nonEnforcingEntityLoader = instance(nonEnforcingEntityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(nonEnforcingEntityLoader);
      await expect(enforcingEntityLoader.loadByIDAsync(anything())).resolves.toEqual(resolved);
    });
  });

  describe('loadByIDNullableAsync', () => {
    it('throws when result is unsuccessful', async () => {
      const nonEnforcingEntityLoaderMock = mock<
        AuthorizationResultBasedEntityLoader<any, any, any, any, any, any>
      >(AuthorizationResultBasedEntityLoader);
      const rejection = new Error();
      when(nonEnforcingEntityLoaderMock.loadByIDNullableAsync(anything())).thenResolve(
        result(rejection),
      );
      const nonEnforcingEntityLoader = instance(nonEnforcingEntityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(nonEnforcingEntityLoader);
      await expect(enforcingEntityLoader.loadByIDNullableAsync(anything())).rejects.toThrow(
        rejection,
      );
    });

    it('returns value when result is successful', async () => {
      const nonEnforcingEntityLoaderMock = mock<
        AuthorizationResultBasedEntityLoader<any, any, any, any, any, any>
      >(AuthorizationResultBasedEntityLoader);
      const resolved = {};
      when(nonEnforcingEntityLoaderMock.loadByIDNullableAsync(anything())).thenResolve(
        result(resolved),
      );
      const nonEnforcingEntityLoader = instance(nonEnforcingEntityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(nonEnforcingEntityLoader);
      await expect(enforcingEntityLoader.loadByIDNullableAsync(anything())).resolves.toEqual(
        resolved,
      );
    });

    it('returns null when non-existent object', async () => {
      const nonEnforcingEntityLoaderMock = mock<
        AuthorizationResultBasedEntityLoader<any, any, any, any, any, any>
      >(AuthorizationResultBasedEntityLoader);
      const resolved = null;
      when(nonEnforcingEntityLoaderMock.loadByIDNullableAsync(anything())).thenResolve(
        result(resolved),
      );
      const nonEnforcingEntityLoader = instance(nonEnforcingEntityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(nonEnforcingEntityLoader);
      await expect(enforcingEntityLoader.loadByIDNullableAsync(anything())).resolves.toEqual(
        resolved,
      );
    });
  });

  describe('loadManyByIDsAsync', () => {
    it('throws when result is unsuccessful', async () => {
      const nonEnforcingEntityLoaderMock = mock<
        AuthorizationResultBasedEntityLoader<any, any, any, any, any, any>
      >(AuthorizationResultBasedEntityLoader);
      const rejection = new Error();
      when(nonEnforcingEntityLoaderMock.loadManyByIDsAsync(anything())).thenResolve(
        new Map(
          Object.entries({
            hello: result(rejection),
          }),
        ),
      );
      const nonEnforcingEntityLoader = instance(nonEnforcingEntityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(nonEnforcingEntityLoader);
      await expect(enforcingEntityLoader.loadManyByIDsAsync(anything())).rejects.toThrow(rejection);
    });

    it('returns value when result is successful', async () => {
      const nonEnforcingEntityLoaderMock = mock<
        AuthorizationResultBasedEntityLoader<any, any, any, any, any, any>
      >(AuthorizationResultBasedEntityLoader);
      const resolved = {};
      when(nonEnforcingEntityLoaderMock.loadManyByIDsAsync(anything())).thenResolve(
        new Map(
          Object.entries({
            hello: result(resolved),
          }),
        ),
      );
      const nonEnforcingEntityLoader = instance(nonEnforcingEntityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(nonEnforcingEntityLoader);
      await expect(enforcingEntityLoader.loadManyByIDsAsync(anything())).resolves.toEqual(
        new Map(
          Object.entries({
            hello: resolved,
          }),
        ),
      );
    });
  });

  describe('loadManyByIDsNullableAsync', () => {
    it('throws when result is unsuccessful even when there is a null result', async () => {
      const nonEnforcingEntityLoaderMock = mock<
        AuthorizationResultBasedEntityLoader<any, any, any, any, any, any>
      >(AuthorizationResultBasedEntityLoader);
      const rejection = new Error();
      when(nonEnforcingEntityLoaderMock.loadManyByIDsNullableAsync(anything())).thenResolve(
        new Map(
          Object.entries({
            hello: result(rejection),
            world: null,
          }),
        ),
      );
      const nonEnforcingEntityLoader = instance(nonEnforcingEntityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(nonEnforcingEntityLoader);
      await expect(enforcingEntityLoader.loadManyByIDsNullableAsync(anything())).rejects.toThrow(
        rejection,
      );
    });

    it('returns value when result is successful', async () => {
      const nonEnforcingEntityLoaderMock = mock<
        AuthorizationResultBasedEntityLoader<any, any, any, any, any, any>
      >(AuthorizationResultBasedEntityLoader);
      const resolved = {};
      when(nonEnforcingEntityLoaderMock.loadManyByIDsNullableAsync(anything())).thenResolve(
        new Map(
          Object.entries({
            hello: result(resolved),
            world: null,
          }),
        ),
      );
      const nonEnforcingEntityLoader = instance(nonEnforcingEntityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(nonEnforcingEntityLoader);
      await expect(enforcingEntityLoader.loadManyByIDsNullableAsync(anything())).resolves.toEqual(
        new Map(
          Object.entries({
            hello: resolved,
            world: null,
          }),
        ),
      );
    });
  });

  describe('loadFirstByFieldEqualityConjunction', () => {
    it('throws when result is unsuccessful', async () => {
      const nonEnforcingEntityLoaderMock = mock<
        AuthorizationResultBasedEntityLoader<any, any, any, any, any, any>
      >(AuthorizationResultBasedEntityLoader);
      const rejection = new Error();
      when(
        nonEnforcingEntityLoaderMock.loadFirstByFieldEqualityConjunctionAsync(
          anything(),
          anything(),
        ),
      ).thenResolve(result(rejection));
      const nonEnforcingEntityLoader = instance(nonEnforcingEntityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(nonEnforcingEntityLoader);
      await expect(
        enforcingEntityLoader.loadFirstByFieldEqualityConjunctionAsync(anything(), anything()),
      ).rejects.toThrow(rejection);
    });

    it('returns value when result is successful', async () => {
      const nonEnforcingEntityLoaderMock = mock<
        AuthorizationResultBasedEntityLoader<any, any, any, any, any, any>
      >(AuthorizationResultBasedEntityLoader);
      const resolved = {};
      when(
        nonEnforcingEntityLoaderMock.loadFirstByFieldEqualityConjunctionAsync(
          anything(),
          anything(),
        ),
      ).thenResolve(result(resolved));
      const nonEnforcingEntityLoader = instance(nonEnforcingEntityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(nonEnforcingEntityLoader);
      await expect(
        enforcingEntityLoader.loadFirstByFieldEqualityConjunctionAsync(anything(), anything()),
      ).resolves.toEqual(resolved);
    });

    it('returns null when the query is successful but no rows match', async () => {
      const nonEnforcingEntityLoaderMock = mock<
        AuthorizationResultBasedEntityLoader<any, any, any, any, any, any>
      >(AuthorizationResultBasedEntityLoader);
      when(
        nonEnforcingEntityLoaderMock.loadFirstByFieldEqualityConjunctionAsync(
          anything(),
          anything(),
        ),
      ).thenResolve(null);
      const nonEnforcingEntityLoader = instance(nonEnforcingEntityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(nonEnforcingEntityLoader);
      await expect(
        enforcingEntityLoader.loadFirstByFieldEqualityConjunctionAsync(anything(), anything()),
      ).resolves.toBeNull();
    });
  });

  describe('loadManyByFieldEqualityConjunction', () => {
    it('throws when result is unsuccessful', async () => {
      const nonEnforcingEntityLoaderMock = mock<
        AuthorizationResultBasedEntityLoader<any, any, any, any, any, any>
      >(AuthorizationResultBasedEntityLoader);
      const rejection = new Error();
      when(
        nonEnforcingEntityLoaderMock.loadManyByFieldEqualityConjunctionAsync(
          anything(),
          anything(),
        ),
      ).thenResolve([result(rejection)]);
      const nonEnforcingEntityLoader = instance(nonEnforcingEntityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(nonEnforcingEntityLoader);
      await expect(
        enforcingEntityLoader.loadManyByFieldEqualityConjunctionAsync(anything(), anything()),
      ).rejects.toThrow(rejection);
    });

    it('returns value when result is successful', async () => {
      const nonEnforcingEntityLoaderMock = mock<
        AuthorizationResultBasedEntityLoader<any, any, any, any, any, any>
      >(AuthorizationResultBasedEntityLoader);
      const resolved = {};
      when(
        nonEnforcingEntityLoaderMock.loadManyByFieldEqualityConjunctionAsync(
          anything(),
          anything(),
        ),
      ).thenResolve([result(resolved)]);
      const nonEnforcingEntityLoader = instance(nonEnforcingEntityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(nonEnforcingEntityLoader);
      await expect(
        enforcingEntityLoader.loadManyByFieldEqualityConjunctionAsync(anything(), anything()),
      ).resolves.toEqual([resolved]);
    });
  });

  describe('loadManyByRawWhereClause', () => {
    it('throws when result is unsuccessful', async () => {
      const nonEnforcingEntityLoaderMock = mock<
        AuthorizationResultBasedEntityLoader<any, any, any, any, any, any>
      >(AuthorizationResultBasedEntityLoader);
      const rejection = new Error();
      when(
        nonEnforcingEntityLoaderMock.loadManyByRawWhereClauseAsync(
          anything(),
          anything(),
          anything(),
        ),
      ).thenResolve([result(rejection)]);
      const nonEnforcingEntityLoader = instance(nonEnforcingEntityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(nonEnforcingEntityLoader);
      await expect(
        enforcingEntityLoader.loadManyByRawWhereClauseAsync(anything(), anything(), anything()),
      ).rejects.toThrow(rejection);
    });

    it('returns value when result is successful', async () => {
      const nonEnforcingEntityLoaderMock = mock<
        AuthorizationResultBasedEntityLoader<any, any, any, any, any, any>
      >(AuthorizationResultBasedEntityLoader);
      const resolved = {};
      when(
        nonEnforcingEntityLoaderMock.loadManyByRawWhereClauseAsync(
          anything(),
          anything(),
          anything(),
        ),
      ).thenResolve([result(resolved)]);
      const nonEnforcingEntityLoader = instance(nonEnforcingEntityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(nonEnforcingEntityLoader);
      await expect(
        enforcingEntityLoader.loadManyByRawWhereClauseAsync(anything(), anything(), anything()),
      ).resolves.toEqual([resolved]);
    });
  });

  it('has the same method names as EntityLoader', () => {
    const enforcingLoaderProperties = Object.getOwnPropertyNames(EnforcingEntityLoader.prototype);
    const nonEnforcingLoaderProperties = Object.getOwnPropertyNames(
      AuthorizationResultBasedEntityLoader.prototype,
    );

    // ensure known differences still exist for sanity check
    const knownLoaderOnlyDifferences = ['validateFieldValues'];
    expect(nonEnforcingLoaderProperties).toEqual(
      expect.arrayContaining(knownLoaderOnlyDifferences),
    );

    const loaderPropertiesWithoutKnownDifferences = nonEnforcingLoaderProperties.filter(
      (p) => !knownLoaderOnlyDifferences.includes(p),
    );

    expect(enforcingLoaderProperties).toEqual(loaderPropertiesWithoutKnownDifferences);
  });
});

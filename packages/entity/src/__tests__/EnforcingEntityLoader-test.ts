import { result } from '@expo/results';
import { describe, expect, it } from '@jest/globals';
import { anything, instance, mock, when } from 'ts-mockito';

import { AuthorizationResultBasedEntityLoader } from '../AuthorizationResultBasedEntityLoader';
import { EnforcingEntityLoader } from '../EnforcingEntityLoader';
import { CompositeFieldValueHolder } from '../internal/CompositeFieldHolder';
import { CompositeFieldValueMap } from '../internal/CompositeFieldValueMap';

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

  describe('loadManyByCompositeFieldEqualingManyAsync', () => {
    it('throws when result is unsuccessful', async () => {
      const nonEnforcingEntityLoaderMock = mock<
        AuthorizationResultBasedEntityLoader<any, any, any, any, any, any>
      >(AuthorizationResultBasedEntityLoader);
      const rejection = new Error();
      when(
        nonEnforcingEntityLoaderMock.loadManyByCompositeFieldEqualingManyAsync(
          anything(),
          anything(),
        ),
      ).thenResolve(
        new CompositeFieldValueMap([
          [new CompositeFieldValueHolder({ wat: 'hello' }), [result(rejection)]],
        ]),
      );
      const nonEnforcingEntityLoader = instance(nonEnforcingEntityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(nonEnforcingEntityLoader);
      await expect(
        enforcingEntityLoader.loadManyByCompositeFieldEqualingManyAsync(anything(), anything()),
      ).rejects.toThrow(rejection);
    });

    it('returns value when result is successful', async () => {
      const nonEnforcingEntityLoaderMock = mock<
        AuthorizationResultBasedEntityLoader<any, any, any, any, any, any>
      >(AuthorizationResultBasedEntityLoader);

      const resolved = {};
      when(
        nonEnforcingEntityLoaderMock.loadManyByCompositeFieldEqualingManyAsync(
          anything(),
          anything(),
        ),
      ).thenResolve(
        new CompositeFieldValueMap([
          [new CompositeFieldValueHolder({ wat: 'hello' }), [result(resolved)]],
        ]),
      );

      const nonEnforcingEntityLoader = instance(nonEnforcingEntityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(nonEnforcingEntityLoader);

      await expect(
        enforcingEntityLoader.loadManyByCompositeFieldEqualingManyAsync(anything(), anything()),
      ).resolves.toEqual(
        new CompositeFieldValueMap([[new CompositeFieldValueHolder({ wat: 'hello' }), [resolved]]]),
      );
    });
  });

  describe('loadManyByCompositeFieldEqualingAsync', () => {
    it('throws when result is unsuccessful', async () => {
      const nonEnforcingEntityLoaderMock = mock<
        AuthorizationResultBasedEntityLoader<any, any, any, any, any, any>
      >(AuthorizationResultBasedEntityLoader);

      const rejection = new Error();
      when(
        nonEnforcingEntityLoaderMock.loadManyByCompositeFieldEqualingAsync(anything(), anything()),
      ).thenResolve([result(rejection)]);

      const nonEnforcingEntityLoader = instance(nonEnforcingEntityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(nonEnforcingEntityLoader);

      await expect(
        enforcingEntityLoader.loadManyByCompositeFieldEqualingAsync(anything(), anything()),
      ).rejects.toThrow(rejection);
    });

    it('returns value when result is successful', async () => {
      const nonEnforcingEntityLoaderMock = mock<
        AuthorizationResultBasedEntityLoader<any, any, any, any, any, any>
      >(AuthorizationResultBasedEntityLoader);

      const resolved = {};
      when(
        nonEnforcingEntityLoaderMock.loadManyByCompositeFieldEqualingAsync(anything(), anything()),
      ).thenResolve([result(resolved)]);

      const nonEnforcingEntityLoader = instance(nonEnforcingEntityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(nonEnforcingEntityLoader);

      await expect(
        enforcingEntityLoader.loadManyByCompositeFieldEqualingAsync(anything(), anything()),
      ).resolves.toEqual([resolved]);
    });
  });

  describe('loadByCompositeFieldEqualingAsync', () => {
    it('throws when result is unsuccessful', async () => {
      const nonEnforcingEntityLoaderMock = mock<
        AuthorizationResultBasedEntityLoader<any, any, any, any, any, any>
      >(AuthorizationResultBasedEntityLoader);

      const rejection = new Error();
      when(
        nonEnforcingEntityLoaderMock.loadByCompositeFieldEqualingAsync(anything(), anything()),
      ).thenResolve(result(rejection));

      const nonEnforcingEntityLoader = instance(nonEnforcingEntityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(nonEnforcingEntityLoader);

      await expect(
        enforcingEntityLoader.loadByCompositeFieldEqualingAsync(anything(), anything()),
      ).rejects.toThrow(rejection);
    });

    it('returns value when result is successful', async () => {
      const nonEnforcingEntityLoaderMock = mock<
        AuthorizationResultBasedEntityLoader<any, any, any, any, any, any>
      >(AuthorizationResultBasedEntityLoader);

      const resolved = {};
      when(
        nonEnforcingEntityLoaderMock.loadByCompositeFieldEqualingAsync(anything(), anything()),
      ).thenResolve(result(resolved));

      const nonEnforcingEntityLoader = instance(nonEnforcingEntityLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityLoader(nonEnforcingEntityLoader);

      await expect(
        enforcingEntityLoader.loadByCompositeFieldEqualingAsync(anything(), anything()),
      ).resolves.toEqual(resolved);
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

  it('has the same method names as EntityLoader', () => {
    const enforcingLoaderProperties = Object.getOwnPropertyNames(EnforcingEntityLoader.prototype);
    const nonEnforcingLoaderProperties = Object.getOwnPropertyNames(
      AuthorizationResultBasedEntityLoader.prototype,
    );

    // ensure known differences still exist for sanity check
    const knownLoaderOnlyDifferences = [
      'loadOneByFieldEqualingAsync', // private method used in EntityPrivacyUtils that is not intended to be part of the public API of AuthorizationResultBasedEntityLoader, and has no equivalent in EnforcingEntityLoader
      'validateFieldAndValueAndConvertToHolders',
      'validateFieldAndValuesAndConvertToHolders',
      'validateCompositeFieldAndValuesAndConvertToHolders',
      'constructAndAuthorizeEntitiesFromCompositeFieldValueHolderMapAsync',
    ];
    expect(nonEnforcingLoaderProperties).toEqual(
      expect.arrayContaining(knownLoaderOnlyDifferences),
    );

    const loaderPropertiesWithoutKnownDifferences = nonEnforcingLoaderProperties.filter(
      (p) => !knownLoaderOnlyDifferences.includes(p),
    );

    expect(enforcingLoaderProperties).toEqual(loaderPropertiesWithoutKnownDifferences);
  });
});

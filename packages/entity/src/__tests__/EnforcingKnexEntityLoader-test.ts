import { result } from '@expo/results';
import { describe, expect, it } from '@jest/globals';
import { anything, instance, mock, when } from 'ts-mockito';

import { AuthorizationResultBasedKnexEntityLoader } from '../AuthorizationResultBasedKnexEntityLoader';
import { EnforcingKnexEntityLoader } from '../EnforcingKnexEntityLoader';

describe(EnforcingKnexEntityLoader, () => {
  describe('loadFirstByFieldEqualityConjunction', () => {
    it('throws when result is unsuccessful', async () => {
      const nonEnforcingKnexEntityLoaderMock = mock<
        AuthorizationResultBasedKnexEntityLoader<any, any, any, any, any, any>
      >(AuthorizationResultBasedKnexEntityLoader);
      const rejection = new Error();
      when(
        nonEnforcingKnexEntityLoaderMock.loadFirstByFieldEqualityConjunctionAsync(
          anything(),
          anything(),
        ),
      ).thenResolve(result(rejection));
      const nonEnforcingKnexEntityLoader = instance(nonEnforcingKnexEntityLoaderMock);
      const enforcingKnexEntityLoader = new EnforcingKnexEntityLoader(nonEnforcingKnexEntityLoader);
      await expect(
        enforcingKnexEntityLoader.loadFirstByFieldEqualityConjunctionAsync(anything(), anything()),
      ).rejects.toThrow(rejection);
    });

    it('returns value when result is successful', async () => {
      const nonEnforcingKnexEntityLoaderMock = mock<
        AuthorizationResultBasedKnexEntityLoader<any, any, any, any, any, any>
      >(AuthorizationResultBasedKnexEntityLoader);
      const resolved = {};
      when(
        nonEnforcingKnexEntityLoaderMock.loadFirstByFieldEqualityConjunctionAsync(
          anything(),
          anything(),
        ),
      ).thenResolve(result(resolved));
      const nonEnforcingKnexEntityLoader = instance(nonEnforcingKnexEntityLoaderMock);
      const enforcingKnexEntityLoader = new EnforcingKnexEntityLoader(nonEnforcingKnexEntityLoader);
      await expect(
        enforcingKnexEntityLoader.loadFirstByFieldEqualityConjunctionAsync(anything(), anything()),
      ).resolves.toEqual(resolved);
    });

    it('returns null when the query is successful but no rows match', async () => {
      const nonEnforcingKnexEntityLoaderMock = mock<
        AuthorizationResultBasedKnexEntityLoader<any, any, any, any, any, any>
      >(AuthorizationResultBasedKnexEntityLoader);
      when(
        nonEnforcingKnexEntityLoaderMock.loadFirstByFieldEqualityConjunctionAsync(
          anything(),
          anything(),
        ),
      ).thenResolve(null);
      const nonEnforcingKnexEntityLoader = instance(nonEnforcingKnexEntityLoaderMock);
      const enforcingKnexEntityLoader = new EnforcingKnexEntityLoader(nonEnforcingKnexEntityLoader);
      await expect(
        enforcingKnexEntityLoader.loadFirstByFieldEqualityConjunctionAsync(anything(), anything()),
      ).resolves.toBeNull();
    });
  });

  describe('loadManyByFieldEqualityConjunction', () => {
    it('throws when result is unsuccessful', async () => {
      const nonEnforcingKnexEntityLoaderMock = mock<
        AuthorizationResultBasedKnexEntityLoader<any, any, any, any, any, any>
      >(AuthorizationResultBasedKnexEntityLoader);
      const rejection = new Error();
      when(
        nonEnforcingKnexEntityLoaderMock.loadManyByFieldEqualityConjunctionAsync(
          anything(),
          anything(),
        ),
      ).thenResolve([result(rejection)]);
      const nonEnforcingKnexEntityLoader = instance(nonEnforcingKnexEntityLoaderMock);
      const enforcingKnexEntityLoader = new EnforcingKnexEntityLoader(nonEnforcingKnexEntityLoader);
      await expect(
        enforcingKnexEntityLoader.loadManyByFieldEqualityConjunctionAsync(anything(), anything()),
      ).rejects.toThrow(rejection);
    });

    it('returns value when result is successful', async () => {
      const nonEnforcingKnexEntityLoaderMock = mock<
        AuthorizationResultBasedKnexEntityLoader<any, any, any, any, any, any>
      >(AuthorizationResultBasedKnexEntityLoader);
      const resolved = {};
      when(
        nonEnforcingKnexEntityLoaderMock.loadManyByFieldEqualityConjunctionAsync(
          anything(),
          anything(),
        ),
      ).thenResolve([result(resolved)]);
      const nonEnforcingKnexEntityLoader = instance(nonEnforcingKnexEntityLoaderMock);
      const enforcingKnexEntityLoader = new EnforcingKnexEntityLoader(nonEnforcingKnexEntityLoader);
      await expect(
        enforcingKnexEntityLoader.loadManyByFieldEqualityConjunctionAsync(anything(), anything()),
      ).resolves.toEqual([resolved]);
    });
  });

  describe('loadManyByRawWhereClause', () => {
    it('throws when result is unsuccessful', async () => {
      const nonEnforcingKnexEntityLoaderMock = mock<
        AuthorizationResultBasedKnexEntityLoader<any, any, any, any, any, any>
      >(AuthorizationResultBasedKnexEntityLoader);
      const rejection = new Error();
      when(
        nonEnforcingKnexEntityLoaderMock.loadManyByRawWhereClauseAsync(
          anything(),
          anything(),
          anything(),
        ),
      ).thenResolve([result(rejection)]);
      const nonEnforcingKnexEntityLoader = instance(nonEnforcingKnexEntityLoaderMock);
      const enforcingKnexEntityLoader = new EnforcingKnexEntityLoader(nonEnforcingKnexEntityLoader);
      await expect(
        enforcingKnexEntityLoader.loadManyByRawWhereClauseAsync(anything(), anything(), anything()),
      ).rejects.toThrow(rejection);
    });

    it('returns value when result is successful', async () => {
      const nonEnforcingKnexEntityLoaderMock = mock<
        AuthorizationResultBasedKnexEntityLoader<any, any, any, any, any, any>
      >(AuthorizationResultBasedKnexEntityLoader);
      const resolved = {};
      when(
        nonEnforcingKnexEntityLoaderMock.loadManyByRawWhereClauseAsync(
          anything(),
          anything(),
          anything(),
        ),
      ).thenResolve([result(resolved)]);
      const nonEnforcingKnexEntityLoader = instance(nonEnforcingKnexEntityLoaderMock);
      const enforcingKnexEntityLoader = new EnforcingKnexEntityLoader(nonEnforcingKnexEntityLoader);
      await expect(
        enforcingKnexEntityLoader.loadManyByRawWhereClauseAsync(anything(), anything(), anything()),
      ).resolves.toEqual([resolved]);
    });
  });

  it('has the same method names as AuthorizationResultBasedKnexEntityLoader', () => {
    const enforcingKnexLoaderProperties = Object.getOwnPropertyNames(
      EnforcingKnexEntityLoader.prototype,
    );
    const nonEnforcingKnexLoaderProperties = Object.getOwnPropertyNames(
      AuthorizationResultBasedKnexEntityLoader.prototype,
    );

    // The knex loaders don't have the internal validation methods that regular loaders have,
    // so we just check that all methods match without any exclusions
    expect(enforcingKnexLoaderProperties).toEqual(nonEnforcingKnexLoaderProperties);
  });
});

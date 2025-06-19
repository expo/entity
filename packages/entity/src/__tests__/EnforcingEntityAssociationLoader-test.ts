import { result } from '@expo/results';
import { describe, expect, it } from '@jest/globals';
import { anything, instance, mock, when } from 'ts-mockito';

import { AuthorizationResultBasedEntityAssociationLoader } from '../AuthorizationResultBasedEntityAssociationLoader';
import { EnforcingEntityAssociationLoader } from '../EnforcingEntityAssociationLoader';

describe(EnforcingEntityAssociationLoader, () => {
  describe('loadAssociatedEntityAsync', () => {
    it('throws when result is unsuccessful', async () => {
      const nonEnforcingEntityAssociationLoaderMock =
        mock<AuthorizationResultBasedEntityAssociationLoader<any, any, any, any, any>>();
      const rejection = new Error();
      when(
        nonEnforcingEntityAssociationLoaderMock.loadAssociatedEntityAsync(anything(), anything()),
      ).thenResolve(result(rejection));
      const nonEnforcingEntityAssociationLoader = instance(nonEnforcingEntityAssociationLoaderMock);
      const enforcingEntityAssociationLoader = new EnforcingEntityAssociationLoader(
        nonEnforcingEntityAssociationLoader,
      );
      await expect(
        enforcingEntityAssociationLoader.loadAssociatedEntityAsync(anything(), anything()),
      ).rejects.toThrow(rejection);
    });

    it('returns value when result is successful', async () => {
      const nonEnforcingEntityAssociationLoaderMock =
        mock<AuthorizationResultBasedEntityAssociationLoader<any, any, any, any, any>>();
      const resolved = {} as any;
      when(
        nonEnforcingEntityAssociationLoaderMock.loadAssociatedEntityAsync(anything(), anything()),
      ).thenResolve(result(resolved));
      const nonEnforcingEntityAssociationLoader = instance(nonEnforcingEntityAssociationLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityAssociationLoader(
        nonEnforcingEntityAssociationLoader,
      );
      await expect(
        enforcingEntityLoader.loadAssociatedEntityAsync(anything(), anything()),
      ).resolves.toEqual(resolved);
    });
  });

  describe('loadManyAssociatedEntitiesAsync', () => {
    it('throws when result is unsuccessful', async () => {
      const nonEnforcingEntityAssociationLoaderMock =
        mock<AuthorizationResultBasedEntityAssociationLoader<any, any, any, any, any>>();
      const rejection = new Error();
      when(
        nonEnforcingEntityAssociationLoaderMock.loadManyAssociatedEntitiesAsync(
          anything(),
          anything() as never,
        ),
      ).thenResolve([result(rejection)]);
      const nonEnforcingEntityAssociationLoader = instance(nonEnforcingEntityAssociationLoaderMock);
      const enforcingEntityAssociationLoader = new EnforcingEntityAssociationLoader(
        nonEnforcingEntityAssociationLoader,
      );
      await expect(
        enforcingEntityAssociationLoader.loadManyAssociatedEntitiesAsync(
          anything(),
          anything() as never,
        ),
      ).rejects.toThrow(rejection);
    });

    it('returns value when result is successful', async () => {
      const nonEnforcingEntityAssociationLoaderMock =
        mock<AuthorizationResultBasedEntityAssociationLoader<any, any, any, any, any>>();
      const resolved = [] as any;
      when(
        nonEnforcingEntityAssociationLoaderMock.loadManyAssociatedEntitiesAsync(
          anything(),
          anything() as never,
        ),
      ).thenResolve([result(resolved)]);
      const nonEnforcingEntityAssociationLoader = instance(nonEnforcingEntityAssociationLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityAssociationLoader(
        nonEnforcingEntityAssociationLoader,
      );
      await expect(
        enforcingEntityLoader.loadManyAssociatedEntitiesAsync(anything(), anything() as never),
      ).resolves.toEqual([resolved]);
    });
  });

  describe('loadAssociatedEntityByFieldEqualingAsync', () => {
    it('throws when result is unsuccessful', async () => {
      const nonEnforcingEntityAssociationLoaderMock =
        mock<AuthorizationResultBasedEntityAssociationLoader<any, any, any, any, any>>();
      const rejection = new Error();
      when(
        nonEnforcingEntityAssociationLoaderMock.loadAssociatedEntityByFieldEqualingAsync(
          anything(),
          anything(),
          anything() as never,
        ),
      ).thenResolve(result(rejection));
      const nonEnforcingEntityAssociationLoader = instance(nonEnforcingEntityAssociationLoaderMock);
      const enforcingEntityAssociationLoader = new EnforcingEntityAssociationLoader(
        nonEnforcingEntityAssociationLoader,
      );
      await expect(
        enforcingEntityAssociationLoader.loadAssociatedEntityByFieldEqualingAsync(
          anything(),
          anything(),
          anything() as never,
        ),
      ).rejects.toThrow(rejection);
    });

    it('returns value when result is successful', async () => {
      const nonEnforcingEntityAssociationLoaderMock =
        mock<AuthorizationResultBasedEntityAssociationLoader<any, any, any, any, any>>();
      const resolved = {} as any;
      when(
        nonEnforcingEntityAssociationLoaderMock.loadAssociatedEntityByFieldEqualingAsync(
          anything(),
          anything(),
          anything() as never,
        ),
      ).thenResolve(result(resolved));
      const nonEnforcingEntityAssociationLoader = instance(nonEnforcingEntityAssociationLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityAssociationLoader(
        nonEnforcingEntityAssociationLoader,
      );
      await expect(
        enforcingEntityLoader.loadAssociatedEntityByFieldEqualingAsync(
          anything(),
          anything(),
          anything() as never,
        ),
      ).resolves.toEqual(resolved);
    });

    it('returns null when result is successful but null', async () => {
      const nonEnforcingEntityAssociationLoaderMock =
        mock<AuthorizationResultBasedEntityAssociationLoader<any, any, any, any, any>>();
      const resolved = null;
      when(
        nonEnforcingEntityAssociationLoaderMock.loadAssociatedEntityByFieldEqualingAsync(
          anything(),
          anything(),
          anything() as never,
        ),
      ).thenResolve(resolved);
      const nonEnforcingEntityAssociationLoader = instance(nonEnforcingEntityAssociationLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityAssociationLoader(
        nonEnforcingEntityAssociationLoader,
      );
      await expect(
        enforcingEntityLoader.loadAssociatedEntityByFieldEqualingAsync(
          anything(),
          anything(),
          anything() as never,
        ),
      ).resolves.toEqual(resolved);
    });
  });

  describe('loadManyAssociatedEntitiesByFieldEqualingAsync', () => {
    it('throws when result is unsuccessful', async () => {
      const nonEnforcingEntityAssociationLoaderMock =
        mock<AuthorizationResultBasedEntityAssociationLoader<any, any, any, any, any>>();
      const rejection = new Error();
      when(
        nonEnforcingEntityAssociationLoaderMock.loadManyAssociatedEntitiesByFieldEqualingAsync(
          anything(),
          anything(),
          anything() as never,
        ),
      ).thenResolve([result(rejection)]);
      const nonEnforcingEntityAssociationLoader = instance(nonEnforcingEntityAssociationLoaderMock);
      const enforcingEntityAssociationLoader = new EnforcingEntityAssociationLoader(
        nonEnforcingEntityAssociationLoader,
      );
      await expect(
        enforcingEntityAssociationLoader.loadManyAssociatedEntitiesByFieldEqualingAsync(
          anything(),
          anything(),
          anything() as never,
        ),
      ).rejects.toThrow(rejection);
    });

    it('returns value when result is successful', async () => {
      const nonEnforcingEntityAssociationLoaderMock =
        mock<AuthorizationResultBasedEntityAssociationLoader<any, any, any, any, any>>();
      const resolved = [] as any;
      when(
        nonEnforcingEntityAssociationLoaderMock.loadManyAssociatedEntitiesByFieldEqualingAsync(
          anything(),
          anything(),
          anything() as never,
        ),
      ).thenResolve([result(resolved)]);
      const nonEnforcingEntityAssociationLoader = instance(nonEnforcingEntityAssociationLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityAssociationLoader(
        nonEnforcingEntityAssociationLoader,
      );
      await expect(
        enforcingEntityLoader.loadManyAssociatedEntitiesByFieldEqualingAsync(
          anything(),
          anything(),
          anything() as never,
        ),
      ).resolves.toEqual([resolved]);
    });
  });

  describe('loadAssociatedEntityThroughAsync', () => {
    it('throws when result is unsuccessful', async () => {
      const nonEnforcingEntityAssociationLoaderMock =
        mock<AuthorizationResultBasedEntityAssociationLoader<any, any, any, any, any>>();
      const rejection = new Error();
      when(
        nonEnforcingEntityAssociationLoaderMock.loadAssociatedEntityThroughAsync(anything()),
      ).thenResolve(result(rejection));
      const nonEnforcingEntityAssociationLoader = instance(nonEnforcingEntityAssociationLoaderMock);
      const enforcingEntityAssociationLoader = new EnforcingEntityAssociationLoader(
        nonEnforcingEntityAssociationLoader,
      );
      await expect(
        enforcingEntityAssociationLoader.loadAssociatedEntityThroughAsync(anything()),
      ).rejects.toThrow(rejection);
    });

    it('returns value when result is successful', async () => {
      const nonEnforcingEntityAssociationLoaderMock =
        mock<AuthorizationResultBasedEntityAssociationLoader<any, any, any, any, any>>();
      const resolved = {} as any;
      when(
        nonEnforcingEntityAssociationLoaderMock.loadAssociatedEntityThroughAsync(anything()),
      ).thenResolve(result(resolved));
      const nonEnforcingEntityAssociationLoader = instance(nonEnforcingEntityAssociationLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityAssociationLoader(
        nonEnforcingEntityAssociationLoader,
      );
      await expect(
        enforcingEntityLoader.loadAssociatedEntityThroughAsync(anything()),
      ).resolves.toEqual(resolved);
    });
  });

  it('has the same method names as AuthorizationResultBasedEntityAssociationLoader', () => {
    const enforcingLoaderProperties = Object.getOwnPropertyNames(
      EnforcingEntityAssociationLoader.prototype,
    );
    const nonEnforcingLoaderProperties = Object.getOwnPropertyNames(
      AuthorizationResultBasedEntityAssociationLoader.prototype,
    );

    expect(enforcingLoaderProperties).toEqual(nonEnforcingLoaderProperties);
  });
});

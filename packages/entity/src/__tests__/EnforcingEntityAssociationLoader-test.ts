import { result } from '@expo/results';
import { mock, instance, when, anything } from 'ts-mockito';

import AuthorizationResultBasedEntityAssociationLoader from '../AuthorizationResultBasedEntityAssociationLoader';
import EnforcingEntityAssociationLoader from '../EnforcingEntityAssociationLoader';

describe(EnforcingEntityAssociationLoader, () => {
  describe('loadAssociatedEntityAsync', () => {
    it('throws when result is unsuccessful', async () => {
      const nonEnforcingEntityAssociationLoaderMock =
        mock<AuthorizationResultBasedEntityAssociationLoader<any, any, any, any, any>>();
      const rejection = new Error();
      when(
        nonEnforcingEntityAssociationLoaderMock.loadAssociatedEntityAsync(
          anything(),
          anything(),
          anything(),
        ),
      ).thenResolve(result(rejection));
      const nonEnforcingEntityAssociationLoader = instance(nonEnforcingEntityAssociationLoaderMock);
      const enforcingEntityAssociationLoader = new EnforcingEntityAssociationLoader(
        nonEnforcingEntityAssociationLoader,
      );
      await expect(
        enforcingEntityAssociationLoader.loadAssociatedEntityAsync(
          anything(),
          anything(),
          anything(),
        ),
      ).rejects.toThrow(rejection);
    });

    it('returns value when result is successful', async () => {
      const nonEnforcingEntityAssociationLoaderMock =
        mock<AuthorizationResultBasedEntityAssociationLoader<any, any, any, any, any>>();
      const resolved = {} as any;
      when(
        nonEnforcingEntityAssociationLoaderMock.loadAssociatedEntityAsync(
          anything(),
          anything(),
          anything(),
        ),
      ).thenResolve(result(resolved));
      const nonEnforcingEntityAssociationLoader = instance(nonEnforcingEntityAssociationLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityAssociationLoader(
        nonEnforcingEntityAssociationLoader,
      );
      await expect(
        enforcingEntityLoader.loadAssociatedEntityAsync(anything(), anything(), anything()),
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
          anything(),
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
          anything(),
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
          anything(),
        ),
      ).thenResolve([result(resolved)]);
      const nonEnforcingEntityAssociationLoader = instance(nonEnforcingEntityAssociationLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityAssociationLoader(
        nonEnforcingEntityAssociationLoader,
      );
      await expect(
        enforcingEntityLoader.loadManyAssociatedEntitiesAsync(
          anything(),
          anything() as never,
          anything(),
        ),
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
          anything(),
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
          anything(),
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
          anything(),
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
          anything(),
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
          anything(),
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
          anything(),
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
          anything(),
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
          anything(),
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
          anything(),
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
          anything(),
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
        nonEnforcingEntityAssociationLoaderMock.loadAssociatedEntityThroughAsync(
          anything(),
          anything(),
        ),
      ).thenResolve(result(rejection));
      const nonEnforcingEntityAssociationLoader = instance(nonEnforcingEntityAssociationLoaderMock);
      const enforcingEntityAssociationLoader = new EnforcingEntityAssociationLoader(
        nonEnforcingEntityAssociationLoader,
      );
      await expect(
        enforcingEntityAssociationLoader.loadAssociatedEntityThroughAsync(anything(), anything()),
      ).rejects.toThrow(rejection);
    });

    it('returns value when result is successful', async () => {
      const nonEnforcingEntityAssociationLoaderMock =
        mock<AuthorizationResultBasedEntityAssociationLoader<any, any, any, any, any>>();
      const resolved = {} as any;
      when(
        nonEnforcingEntityAssociationLoaderMock.loadAssociatedEntityThroughAsync(
          anything(),
          anything(),
        ),
      ).thenResolve(result(resolved));
      const nonEnforcingEntityAssociationLoader = instance(nonEnforcingEntityAssociationLoaderMock);
      const enforcingEntityLoader = new EnforcingEntityAssociationLoader(
        nonEnforcingEntityAssociationLoader,
      );
      await expect(
        enforcingEntityLoader.loadAssociatedEntityThroughAsync(anything(), anything()),
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

import { describe, expect, it } from '@jest/globals';

import { AuthorizationResultBasedEntityAssociationLoader } from '../AuthorizationResultBasedEntityAssociationLoader.ts';
import { EnforcingEntityAssociationLoader } from '../EnforcingEntityAssociationLoader.ts';
import { EntityAssociationLoader } from '../EntityAssociationLoader.ts';
import { ViewerContext } from '../ViewerContext.ts';
import { SimpleTestEntity } from '../utils/__testfixtures__/SimpleTestEntity.ts';
import { createUnitTestEntityCompanionProvider } from '../utils/__testfixtures__/createUnitTestEntityCompanionProvider.ts';

describe(EntityAssociationLoader, () => {
  describe('enforcing', () => {
    it('creates a new EnforcingEntityLoader', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);
      const testEntity = await SimpleTestEntity.creator(viewerContext).createAsync();
      expect(testEntity.associationLoader()).toBeInstanceOf(EnforcingEntityAssociationLoader);
    });
  });

  describe('withAuthorizationResults', () => {
    it('creates a new AuthorizationResultBasedEntityAssociationLoader', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);
      const testEntity = await SimpleTestEntity.creator(viewerContext).createAsync();
      expect(testEntity.associationLoaderWithAuthorizationResults()).toBeInstanceOf(
        AuthorizationResultBasedEntityAssociationLoader,
      );
    });
  });
});

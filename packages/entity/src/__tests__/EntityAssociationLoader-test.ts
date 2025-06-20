import { describe, expect, it } from '@jest/globals';

import AuthorizationResultBasedEntityAssociationLoader from '../AuthorizationResultBasedEntityAssociationLoader';
import EnforcingEntityAssociationLoader from '../EnforcingEntityAssociationLoader';
import EntityAssociationLoader from '../EntityAssociationLoader';
import ViewerContext from '../ViewerContext';
import SimpleTestEntity from '../utils/__testfixtures__/SimpleTestEntity';
import { createUnitTestEntityCompanionProvider } from '../utils/__testfixtures__/createUnitTestEntityCompanionProvider';

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

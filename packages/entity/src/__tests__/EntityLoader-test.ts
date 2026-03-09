import { describe, expect, it } from '@jest/globals';

import { AuthorizationResultBasedEntityLoader } from '../AuthorizationResultBasedEntityLoader.ts';
import { EnforcingEntityLoader } from '../EnforcingEntityLoader.ts';
import { EntityInvalidationUtils } from '../EntityInvalidationUtils.ts';
import { EntityLoader } from '../EntityLoader.ts';
import { ViewerContext } from '../ViewerContext.ts';
import { SimpleTestEntity } from '../utils/__testfixtures__/SimpleTestEntity.ts';
import { createUnitTestEntityCompanionProvider } from '../utils/__testfixtures__/createUnitTestEntityCompanionProvider.ts';

describe(EntityLoader, () => {
  describe('enforcing', () => {
    it('creates a new EnforcingEntityLoader', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);
      expect(SimpleTestEntity.loader(viewerContext)).toBeInstanceOf(EnforcingEntityLoader);
    });
  });

  describe('withAuthorizationResults', () => {
    it('creates a new AuthorizationResultBasedEntityLoader', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);
      expect(SimpleTestEntity.loaderWithAuthorizationResults(viewerContext)).toBeInstanceOf(
        AuthorizationResultBasedEntityLoader,
      );
    });
  });

  describe('invalidationUtils', () => {
    it('returns a instance of EntityInvalidationUtils', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);
      expect(SimpleTestEntity.invalidationUtils(viewerContext)).toBeInstanceOf(
        EntityInvalidationUtils,
      );
    });
  });
});

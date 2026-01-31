import { describe, expect, it } from '@jest/globals';

import { AuthorizationResultBasedEntityLoader } from '../AuthorizationResultBasedEntityLoader';
import { EnforcingEntityLoader } from '../EnforcingEntityLoader';
import { EntityConstructionUtils } from '../EntityConstructionUtils';
import { EntityInvalidationUtils } from '../EntityInvalidationUtils';
import { EntityLoader } from '../EntityLoader';
import { ViewerContext } from '../ViewerContext';
import { SimpleTestEntity } from '../utils/__testfixtures__/SimpleTestEntity';
import { createUnitTestEntityCompanionProvider } from '../utils/__testfixtures__/createUnitTestEntityCompanionProvider';

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

  describe('constructionUtils', () => {
    it('returns a instance of EntityConstructionUtils', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);
      expect(SimpleTestEntity.constructionUtils(viewerContext)).toBeInstanceOf(
        EntityConstructionUtils,
      );
    });
  });
});

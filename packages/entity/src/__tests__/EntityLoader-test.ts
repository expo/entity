import { describe, expect, it } from '@jest/globals';

import AuthorizationResultBasedEntityLoader from '../AuthorizationResultBasedEntityLoader';
import EnforcingEntityLoader from '../EnforcingEntityLoader';
import EntityLoader from '../EntityLoader';
import EntityLoaderUtils from '../EntityLoaderUtils';
import ViewerContext from '../ViewerContext';
import SimpleTestEntity from '../utils/__testfixtures__/SimpleTestEntity';
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

  describe('utils', () => {
    it('returns a instance of EntityLoaderUtils', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);
      expect(SimpleTestEntity.loaderUtils(viewerContext)).toBeInstanceOf(EntityLoaderUtils);
    });
  });
});

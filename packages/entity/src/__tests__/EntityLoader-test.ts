import AuthorizationResultBasedEntityLoader from '../AuthorizationResultBasedEntityLoader';
import EnforcingEntityLoader from '../EnforcingEntityLoader';
import EntityLoader from '../EntityLoader';
import EntityLoaderUtils from '../EntityLoaderUtils';
import ViewerContext from '../ViewerContext';
import SimpleTestEntity from '../testfixtures/SimpleTestEntity';
import { createUnitTestEntityCompanionProvider } from '../utils/testing/createUnitTestEntityCompanionProvider';

describe(EntityLoader, () => {
  describe('enforcing', () => {
    it('creates a new EnforcingEntityLoader', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);
      expect(SimpleTestEntity.loader(viewerContext).enforcing()).toBeInstanceOf(
        EnforcingEntityLoader,
      );
    });
  });

  describe('withAuthorizationResults', () => {
    it('creates a new AuthorizationResultBasedEntityLoader', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);
      expect(SimpleTestEntity.loader(viewerContext).withAuthorizationResults()).toBeInstanceOf(
        AuthorizationResultBasedEntityLoader,
      );
    });
  });

  describe('utils', () => {
    it('returns a instance of EntityLoaderUtils', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);
      expect(SimpleTestEntity.loader(viewerContext).utils()).toBeInstanceOf(EntityLoaderUtils);
    });
  });
});

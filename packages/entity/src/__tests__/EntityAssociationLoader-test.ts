import AuthorizationResultBasedEntityAssociationLoader from '../AuthorizationResultBasedEntityAssociationLoader';
import EnforcingEntityAssociationLoader from '../EnforcingEntityAssociationLoader';
import EntityAssociationLoader from '../EntityAssociationLoader';
import ViewerContext from '../ViewerContext';
import SimpleTestEntity from '../testfixtures/SimpleTestEntity';
import { createUnitTestEntityCompanionProvider } from '../utils/testing/createUnitTestEntityCompanionProvider';

describe(EntityAssociationLoader, () => {
  describe('enforcing', () => {
    it('creates a new EnforcingEntityLoader', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);
      const testEntity = await SimpleTestEntity.creator(viewerContext).enforcing().createAsync();
      expect(testEntity.associationLoader().enforcing()).toBeInstanceOf(
        EnforcingEntityAssociationLoader,
      );
    });
  });

  describe('withAuthorizationResults', () => {
    it('creates a new AuthorizationResultBasedEntityAssociationLoader', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);
      const testEntity = await SimpleTestEntity.creator(viewerContext).enforcing().createAsync();
      expect(testEntity.associationLoader().withAuthorizationResults()).toBeInstanceOf(
        AuthorizationResultBasedEntityAssociationLoader,
      );
    });
  });
});

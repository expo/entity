import { EntityQueryContext } from '../EntityQueryContext';
import ViewerContext from '../ViewerContext';
import { createUnitTestEntityCompanionProvider } from '../utils/testing/createUnitTestEntityCompanionProvider';

describe(ViewerContext, () => {
  describe('getQueryContextForDatabaseAdaptorFlavor', () => {
    it('creates a new regular query context', () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);
      const queryContext = viewerContext.getQueryContextForDatabaseAdaptorFlavor('postgres');
      expect(queryContext).toBeInstanceOf(EntityQueryContext);
      expect(queryContext.isInTransaction()).toBe(false);
    });
  });

  describe('runInTransactionForDatabaseAdaptorFlavorAsync', () => {
    it('creates a new transactional query context', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);
      const didCreateTransaction = await viewerContext.runInTransactionForDatabaseAdaptorFlavorAsync(
        'postgres',
        async (queryContext) => {
          return queryContext.isInTransaction();
        }
      );
      expect(didCreateTransaction).toBe(true);
    });
  });
});

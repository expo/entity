import { describe, expect, it } from '@jest/globals';

import { EntityQueryContext } from '../EntityQueryContext.ts';
import { ViewerContext } from '../ViewerContext.ts';
import { createUnitTestEntityCompanionProvider } from '../utils/__testfixtures__/createUnitTestEntityCompanionProvider.ts';

describe(ViewerContext, () => {
  describe('getQueryContextForDatabaseAdapterFlavor', () => {
    it('creates a new regular query context', () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);
      const queryContext = viewerContext.getQueryContextForDatabaseAdapterFlavor('postgres');
      expect(queryContext).toBeInstanceOf(EntityQueryContext);
      expect(queryContext.isInTransaction()).toBe(false);
    });
  });

  describe('runInTransactionForDatabaseAdapterFlavorAsync', () => {
    it('creates a new transactional query context', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);
      const didCreateTransaction =
        await viewerContext.runInTransactionForDatabaseAdapterFlavorAsync(
          'postgres',
          async (queryContext) => {
            return queryContext.isInTransaction();
          },
        );
      expect(didCreateTransaction).toBe(true);
    });
  });
});

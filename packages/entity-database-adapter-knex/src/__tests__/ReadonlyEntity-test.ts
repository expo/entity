import { ViewerContext } from '@expo/entity';
import { describe, expect, it } from '@jest/globals';

import { AuthorizationResultBasedKnexEntityLoader } from '../AuthorizationResultBasedKnexEntityLoader';
import { EnforcingKnexEntityLoader } from '../EnforcingKnexEntityLoader';
import { knexLoader, knexLoaderWithAuthorizationResults } from '../knexLoader';
import { TestEntity } from './fixtures/TestEntity';
import { createUnitTestPostgresEntityCompanionProvider } from './fixtures/createUnitTestPostgresEntityCompanionProvider';

describe('knexLoader', () => {
  describe('knexLoader', () => {
    it('creates a new EnforcingKnexEntityLoader', async () => {
      const companionProvider = createUnitTestPostgresEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);
      expect(knexLoader(TestEntity, viewerContext)).toBeInstanceOf(EnforcingKnexEntityLoader);
      expect(TestEntity.knexLoader(viewerContext)).toBeInstanceOf(EnforcingKnexEntityLoader);
    });
  });

  describe('knexLoaderWithAuthorizationResults', () => {
    it('creates a new AuthorizationResultBasedKnexEntityLoader', async () => {
      const companionProvider = createUnitTestPostgresEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);
      expect(knexLoaderWithAuthorizationResults(TestEntity, viewerContext)).toBeInstanceOf(
        AuthorizationResultBasedKnexEntityLoader,
      );
      expect(TestEntity.knexLoaderWithAuthorizationResults(viewerContext)).toBeInstanceOf(
        AuthorizationResultBasedKnexEntityLoader,
      );
    });
  });
});

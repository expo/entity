import { describe, expect, it } from '@jest/globals';

import {
  AuthorizationResultBasedCreateMutator,
  AuthorizationResultBasedDeleteMutator,
  AuthorizationResultBasedUpdateMutator,
} from '../AuthorizationResultBasedEntityMutator.ts';
import { EnforcingEntityCreator } from '../EnforcingEntityCreator.ts';
import { EnforcingEntityDeleter } from '../EnforcingEntityDeleter.ts';
import { EnforcingEntityUpdater } from '../EnforcingEntityUpdater.ts';
import { Entity } from '../Entity.ts';
import { ViewerContext } from '../ViewerContext.ts';
import { SimpleTestEntity } from '../utils/__testfixtures__/SimpleTestEntity.ts';
import { createUnitTestEntityCompanionProvider } from '../utils/__testfixtures__/createUnitTestEntityCompanionProvider.ts';

describe(Entity, () => {
  describe('creator', () => {
    it('creates a new EnforcingEntityCreator', () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);
      expect(SimpleTestEntity.creator(viewerContext)).toBeInstanceOf(EnforcingEntityCreator);
    });
  });

  describe('creatorWithAuthorizationResults', () => {
    it('creates a new AuthorizationResultBasedCreateMutator', () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);
      expect(SimpleTestEntity.creatorWithAuthorizationResults(viewerContext)).toBeInstanceOf(
        AuthorizationResultBasedCreateMutator,
      );
    });
  });

  describe('updater', () => {
    it('creates a new EnforcingEntityUpdater', () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);
      const data = {
        id: 'what',
      };
      const testEntity = new SimpleTestEntity({
        viewerContext,
        id: 'what',
        databaseFields: data,
        selectedFields: data,
      });
      expect(SimpleTestEntity.updater(testEntity)).toBeInstanceOf(EnforcingEntityUpdater);
    });
  });

  describe('updaterWithAuthorizationResults', () => {
    it('creates a new AuthorizationResultBasedUpdateMutator', () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);
      const data = {
        id: 'what',
      };
      const testEntity = new SimpleTestEntity({
        viewerContext,
        id: 'what',
        databaseFields: data,
        selectedFields: data,
      });
      expect(SimpleTestEntity.updaterWithAuthorizationResults(testEntity)).toBeInstanceOf(
        AuthorizationResultBasedUpdateMutator,
      );
    });
  });

  describe('deleter', () => {
    it('creates a new EnforcingEntityDeleter', () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);
      const data = {
        id: 'what',
      };
      const testEntity = new SimpleTestEntity({
        viewerContext,
        id: 'what',
        databaseFields: data,
        selectedFields: data,
      });
      expect(SimpleTestEntity.deleter(testEntity)).toBeInstanceOf(EnforcingEntityDeleter);
    });
  });

  describe('deleterWithAuthorizationResults', () => {
    it('creates a new AuthorizationResultBasedDeleteMutator', () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);
      const data = {
        id: 'what',
      };
      const testEntity = new SimpleTestEntity({
        viewerContext,
        id: 'what',
        databaseFields: data,
        selectedFields: data,
      });
      expect(SimpleTestEntity.deleterWithAuthorizationResults(testEntity)).toBeInstanceOf(
        AuthorizationResultBasedDeleteMutator,
      );
    });
  });
});

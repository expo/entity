import Entity from '../Entity';
import EntityCreator from '../EntityCreator';
import EntityDeleter from '../EntityDeleter';
import EntityUpdater from '../EntityUpdater';
import ViewerContext from '../ViewerContext';
import SimpleTestEntity from '../testfixtures/SimpleTestEntity';
import { createUnitTestEntityCompanionProvider } from '../utils/testing/createUnitTestEntityCompanionProvider';

describe(Entity, () => {
  describe('creator', () => {
    it('creates a new EntityCreator', () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);
      expect(SimpleTestEntity.creator(viewerContext)).toBeInstanceOf(EntityCreator);
    });
  });

  describe('updater', () => {
    it('creates a new EntityUpdater', () => {
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
      expect(SimpleTestEntity.updater(testEntity)).toBeInstanceOf(EntityUpdater);
    });
  });

  describe('deleter', () => {
    it('creates a new EntityDeleter', () => {
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
      expect(SimpleTestEntity.deleter(testEntity)).toBeInstanceOf(EntityDeleter);
    });
  });
});

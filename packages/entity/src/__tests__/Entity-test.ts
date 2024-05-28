import Entity from '../Entity';
import { CreateMutator, UpdateMutator } from '../EntityMutator';
import ViewerContext from '../ViewerContext';
import SimpleTestEntity from '../testfixtures/SimpleTestEntity';
import { createUnitTestEntityCompanionProvider } from '../utils/testing/createUnitTestEntityCompanionProvider';

describe(Entity, () => {
  describe('creator', () => {
    it('creates a new CreateMutator', () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);
      expect(SimpleTestEntity.creator(viewerContext)).toBeInstanceOf(CreateMutator);
    });
  });

  describe('updater', () => {
    it('creates a new UpdateMutator', () => {
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
      expect(SimpleTestEntity.updater(testEntity)).toBeInstanceOf(UpdateMutator);
    });
  });
});

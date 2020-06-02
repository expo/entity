import { enforceAsyncResult } from '@expo/results';

import EntityAssociationLoader from '../EntityAssociationLoader';
import TestEntity from '../testfixtures/TestEntity';
import TestEntity2 from '../testfixtures/TestEntity2';
import TestViewerContext from '../testfixtures/TestViewerContext';
import { createUnitTestEntityCompanionProvider } from '../utils/testing/createUnitTestEntityCompanionProvider';

describe(EntityAssociationLoader, () => {
  describe('loadAssociatedEntityAsync', () => {
    it('loads associated entities by ID', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new TestViewerContext(companionProvider);
      const testOtherEntity = await enforceAsyncResult(
        TestEntity.creator(viewerContext).createAsync()
      );
      const testEntity = await enforceAsyncResult(
        TestEntity.creator(viewerContext)
          .setField('stringField', testOtherEntity.getID())
          .createAsync()
      );
      const loadedOther = await enforceAsyncResult(
        testEntity.associationLoader().loadAssociatedEntityAsync('stringField', TestEntity)
      );
      expect(loadedOther.getID()).toEqual(testOtherEntity.getID());
    });
  });

  describe('loadRelatedEntityByFieldEqualingAsync', () => {
    it('loads associated entities by field equaling', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new TestViewerContext(companionProvider);
      const testOtherEntity = await enforceAsyncResult(
        TestEntity.creator(viewerContext).createAsync()
      );
      const testEntity = await enforceAsyncResult(
        TestEntity.creator(viewerContext)
          .setField('stringField', testOtherEntity.getID())
          .createAsync()
      );
      const loadedOtherResult = await testEntity
        .associationLoader()
        .loadAssociatedEntityByFieldEqualingAsync('stringField', TestEntity, 'customIdField');
      expect(loadedOtherResult?.enforceValue().getID()).toEqual(testOtherEntity.getID());
    });

    it('returns null when loading associated entities by field equaling a non existent association', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new TestViewerContext(companionProvider);
      const testEntity = await enforceAsyncResult(
        TestEntity.creator(viewerContext).setField('stringField', 'blah').createAsync()
      );
      const loadedOtherResult = await testEntity
        .associationLoader()
        .loadAssociatedEntityByFieldEqualingAsync('stringField', TestEntity, 'customIdField');
      expect(loadedOtherResult).toBeNull();
    });
  });

  describe('loadAssociatedEntityThroughAsync', () => {
    it('chain loads associated entities', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new TestViewerContext(companionProvider);
      const testEntity4 = await enforceAsyncResult(TestEntity.creator(viewerContext).createAsync());
      const testEntity3 = await enforceAsyncResult(
        TestEntity2.creator(viewerContext).setField('foreignKey', testEntity4.getID()).createAsync()
      );
      const testEntity2 = await enforceAsyncResult(
        TestEntity.creator(viewerContext)
          .setField('testIndexedField', testEntity3.getID())
          .createAsync()
      );
      const testEntity = await enforceAsyncResult(
        TestEntity2.creator(viewerContext).setField('foreignKey', testEntity2.getID()).createAsync()
      );

      const loaded2Result = await testEntity.associationLoader().loadAssociatedEntityThroughAsync([
        {
          associatedEntityClass: TestEntity,
          fieldIdentifyingAssociatedEntity: 'foreignKey',
        },
      ]);
      expect(loaded2Result?.enforceValue().getID()).toEqual(testEntity2.getID());

      const loaded3Result = await testEntity.associationLoader().loadAssociatedEntityThroughAsync([
        {
          associatedEntityClass: TestEntity,
          fieldIdentifyingAssociatedEntity: 'foreignKey',
        },
        {
          associatedEntityClass: TestEntity2,
          fieldIdentifyingAssociatedEntity: 'testIndexedField',
        },
      ]);
      expect(loaded3Result?.enforceValue().getID()).toEqual(testEntity3.getID());

      const loaded4Result = await testEntity.associationLoader().loadAssociatedEntityThroughAsync([
        {
          associatedEntityClass: TestEntity,
          fieldIdentifyingAssociatedEntity: 'foreignKey',
        },
        {
          associatedEntityClass: TestEntity2,
          fieldIdentifyingAssociatedEntity: 'testIndexedField',
        },
        {
          associatedEntityClass: TestEntity,
          fieldIdentifyingAssociatedEntity: 'foreignKey',
        },
      ]);
      expect(loaded4Result?.enforceValue().getID()).toEqual(testEntity4.getID());
    });

    it('fails when chain loading associated entity fails', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new TestViewerContext(companionProvider);

      const testEntity = await enforceAsyncResult(
        TestEntity2.creator(viewerContext).setField('foreignKey', 'fake').createAsync()
      );

      const loadResult = await testEntity.associationLoader().loadAssociatedEntityThroughAsync([
        {
          associatedEntityClass: TestEntity,
          fieldIdentifyingAssociatedEntity: 'foreignKey',
        },
      ]);
      expect(loadResult?.ok).toBe(false);
    });

    it('supports chain loading by field equality', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new TestViewerContext(companionProvider);

      const testEntity2 = await enforceAsyncResult(
        TestEntity.creator(viewerContext).setField('stringField', 'blah').createAsync()
      );
      const testEntity = await enforceAsyncResult(
        TestEntity2.creator(viewerContext).setField('foreignKey', 'blah').createAsync()
      );

      const loaded2Result = await testEntity.associationLoader().loadAssociatedEntityThroughAsync([
        {
          associatedEntityClass: TestEntity,
          fieldIdentifyingAssociatedEntity: 'foreignKey',
          associatedEntityLookupByField: 'stringField',
        },
      ]);
      expect(loaded2Result?.enforceValue().getID()).toEqual(testEntity2.getID());
    });

    it('returns null when chain loading by field equality returns null', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new TestViewerContext(companionProvider);

      const testEntity = await enforceAsyncResult(
        TestEntity2.creator(viewerContext).setField('foreignKey', 'blah').createAsync()
      );

      const loaded2Result = await testEntity.associationLoader().loadAssociatedEntityThroughAsync([
        {
          associatedEntityClass: TestEntity,
          fieldIdentifyingAssociatedEntity: 'foreignKey',
          associatedEntityLookupByField: 'stringField',
        },
      ]);
      expect(loaded2Result).toBeNull();
    });
  });
});

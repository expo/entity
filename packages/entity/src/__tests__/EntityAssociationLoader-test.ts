import { enforceAsyncResult } from '@expo/results';
import { v4 as uuidv4 } from 'uuid';

import EntityAssociationLoader from '../EntityAssociationLoader';
import { enforceResultsAsync } from '../entityUtils';
import TestEntity from '../testfixtures/TestEntity';
import TestEntity2 from '../testfixtures/TestEntity2';
import TestViewerContext from '../testfixtures/TestViewerContext';
import { createUnitTestEntityCompanionProvider } from '../utils/testing/createUnitTestEntityCompanionProvider';

describe(EntityAssociationLoader, () => {
  describe('loadAssociatedEntityAsync', () => {
    it('loads associated entities by ID and correctly handles a null value', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new TestViewerContext(companionProvider);
      const testOtherEntity = await enforceAsyncResult(
        TestEntity.creator(viewerContext).withAuthorizationResults().createAsync(),
      );
      const testEntity = await enforceAsyncResult(
        TestEntity.creator(viewerContext)
          .withAuthorizationResults()
          .setField('stringField', testOtherEntity.getID())
          .createAsync(),
      );
      const loadedOther = await enforceAsyncResult(
        testEntity.associationLoader().loadAssociatedEntityAsync('stringField', TestEntity),
      );
      expect(loadedOther.getID()).toEqual(testOtherEntity.getID());

      const loadedOther2 = await enforceAsyncResult(
        testEntity.associationLoader().loadAssociatedEntityAsync('nullableField', TestEntity),
      );
      expect(loadedOther2).toBeNull();
    });
  });

  describe('loadManyAssociatedEntitiesAsync', () => {
    it('loads many associated entities referencing this entity', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new TestViewerContext(companionProvider);
      const testEntity = await enforceAsyncResult(
        TestEntity.creator(viewerContext).withAuthorizationResults().createAsync(),
      );
      const testOtherEntity1 = await enforceAsyncResult(
        TestEntity.creator(viewerContext)
          .withAuthorizationResults()
          .setField('stringField', testEntity.getID())
          .createAsync(),
      );
      const testOtherEntity2 = await enforceAsyncResult(
        TestEntity.creator(viewerContext)
          .withAuthorizationResults()
          .setField('stringField', testEntity.getID())
          .createAsync(),
      );
      const loaded = await enforceResultsAsync(
        testEntity.associationLoader().loadManyAssociatedEntitiesAsync(TestEntity, 'stringField'),
      );
      expect(loaded).toHaveLength(2);
      expect(loaded.find((e) => e.getID() === testOtherEntity1.getID())).not.toBeUndefined();
      expect(loaded.find((e) => e.getID() === testOtherEntity2.getID())).not.toBeUndefined();
    });
  });

  describe('loadAssociatedEntityByFieldEqualingAsync', () => {
    it('loads associated entity by field equaling', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new TestViewerContext(companionProvider);
      const testOtherEntity = await enforceAsyncResult(
        TestEntity.creator(viewerContext).withAuthorizationResults().createAsync(),
      );
      const testEntity = await enforceAsyncResult(
        TestEntity.creator(viewerContext)
          .withAuthorizationResults()
          .setField('stringField', testOtherEntity.getID())
          .createAsync(),
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
        TestEntity.creator(viewerContext)
          .withAuthorizationResults()
          .setField('stringField', uuidv4())
          .createAsync(),
      );
      const loadedOtherResult = await testEntity
        .associationLoader()
        .loadAssociatedEntityByFieldEqualingAsync('stringField', TestEntity, 'customIdField');
      expect(loadedOtherResult).toBeNull();
    });

    it('returns null when load-by field is null', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new TestViewerContext(companionProvider);
      const testEntity = await enforceAsyncResult(
        TestEntity.creator(viewerContext)
          .withAuthorizationResults()
          .setField('stringField', 'blah')
          .createAsync(),
      );
      const loadedOtherResult = await testEntity
        .associationLoader()
        .loadAssociatedEntityByFieldEqualingAsync('nullableField', TestEntity, 'customIdField');
      expect(loadedOtherResult).toBeNull();
    });
  });

  describe('loadManyAssociatedEntitiesByFieldEqualingAsync', () => {
    it('loads many associated entities by field equaling', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new TestViewerContext(companionProvider);
      const testEntity = await enforceAsyncResult(
        TestEntity.creator(viewerContext).withAuthorizationResults().createAsync(),
      );
      const testOtherEntity1 = await enforceAsyncResult(
        TestEntity.creator(viewerContext)
          .withAuthorizationResults()
          .setField('stringField', testEntity.getID())
          .createAsync(),
      );
      const testOtherEntity2 = await enforceAsyncResult(
        TestEntity.creator(viewerContext)
          .withAuthorizationResults()
          .setField('stringField', testEntity.getID())
          .createAsync(),
      );
      const loaded = await enforceResultsAsync(
        testEntity
          .associationLoader()
          .loadManyAssociatedEntitiesByFieldEqualingAsync(
            'customIdField',
            TestEntity,
            'stringField',
          ),
      );
      expect(loaded).toHaveLength(2);
      expect(loaded.find((e) => e.getID() === testOtherEntity1.getID())).not.toBeUndefined();
      expect(loaded.find((e) => e.getID() === testOtherEntity2.getID())).not.toBeUndefined();
    });

    it('returns empty results when field being queried by is null', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new TestViewerContext(companionProvider);
      const testEntity = await enforceAsyncResult(
        TestEntity.creator(viewerContext).withAuthorizationResults().createAsync(),
      );
      const loaded = await enforceResultsAsync(
        testEntity
          .associationLoader()
          .loadManyAssociatedEntitiesByFieldEqualingAsync(
            'nullableField',
            TestEntity,
            'stringField',
          ),
      );
      expect(loaded).toHaveLength(0);
    });
  });

  describe('loadAssociatedEntityThroughAsync', () => {
    it('chain loads associated entities', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new TestViewerContext(companionProvider);
      const testEntity4 = await enforceAsyncResult(
        TestEntity.creator(viewerContext).withAuthorizationResults().createAsync(),
      );
      const testEntity3 = await enforceAsyncResult(
        TestEntity2.creator(viewerContext)
          .withAuthorizationResults()
          .setField('foreignKey', testEntity4.getID())
          .createAsync(),
      );
      const testEntity2 = await enforceAsyncResult(
        TestEntity.creator(viewerContext)
          .withAuthorizationResults()
          .setField('testIndexedField', testEntity3.getID())
          .createAsync(),
      );
      const testEntity = await enforceAsyncResult(
        TestEntity2.creator(viewerContext)
          .withAuthorizationResults()
          .setField('foreignKey', testEntity2.getID())
          .createAsync(),
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
        TestEntity2.creator(viewerContext)
          .withAuthorizationResults()
          .setField('foreignKey', uuidv4())
          .createAsync(),
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

      const fieldValue = uuidv4();
      const testEntity2 = await enforceAsyncResult(
        TestEntity.creator(viewerContext)
          .withAuthorizationResults()
          .setField('stringField', fieldValue)
          .createAsync(),
      );
      const testEntity = await enforceAsyncResult(
        TestEntity2.creator(viewerContext)
          .withAuthorizationResults()
          .setField('foreignKey', fieldValue)
          .createAsync(),
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
        TestEntity2.creator(viewerContext)
          .withAuthorizationResults()
          .setField('foreignKey', uuidv4())
          .createAsync(),
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

    it('returns null when chain loading by field is null', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new TestViewerContext(companionProvider);

      const testEntity = await enforceAsyncResult(
        TestEntity.creator(viewerContext)
          .withAuthorizationResults()
          .setField('nullableField', null)
          .createAsync(),
      );

      const loadedResult = await testEntity.associationLoader().loadAssociatedEntityThroughAsync([
        {
          associatedEntityClass: TestEntity,
          fieldIdentifyingAssociatedEntity: 'nullableField',
        },
      ]);
      expect(loadedResult).toBeNull();
    });
  });
});

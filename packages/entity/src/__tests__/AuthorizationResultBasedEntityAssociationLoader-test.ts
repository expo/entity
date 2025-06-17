import { enforceAsyncResult } from '@expo/results';
import { describe, expect, it } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';

import AuthorizationResultBasedEntityAssociationLoader from '../AuthorizationResultBasedEntityAssociationLoader';
import { enforceResultsAsync } from '../entityUtils';
import TestEntity from '../utils/__testfixtures__/TestEntity';
import TestEntity2 from '../utils/__testfixtures__/TestEntity2';
import TestViewerContext from '../utils/__testfixtures__/TestViewerContext';
import { createUnitTestEntityCompanionProvider } from '../utils/__testfixtures__/createUnitTestEntityCompanionProvider';

describe(AuthorizationResultBasedEntityAssociationLoader, () => {
  describe('loadAssociatedEntityAsync', () => {
    it('loads associated entities by ID and correctly handles a null value', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new TestViewerContext(companionProvider);
      const testOtherEntity = await enforceAsyncResult(
        TestEntity.creatorWithAuthorizationResults(viewerContext).createAsync(),
      );
      const testEntity = await enforceAsyncResult(
        TestEntity.creatorWithAuthorizationResults(viewerContext)
          .setField('stringField', testOtherEntity.getID())
          .createAsync(),
      );
      const loadedOther = await enforceAsyncResult(
        testEntity
          .associationLoaderWithAuthorizationResults()
          .loadAssociatedEntityAsync('stringField', TestEntity),
      );
      expect(loadedOther.getID()).toEqual(testOtherEntity.getID());

      const loadedOther2 = await enforceAsyncResult(
        testEntity
          .associationLoaderWithAuthorizationResults()
          .loadAssociatedEntityAsync('nullableField', TestEntity),
      );
      expect(loadedOther2).toBeNull();
    });
  });

  describe('loadManyAssociatedEntitiesAsync', () => {
    it('loads many associated entities referencing this entity', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new TestViewerContext(companionProvider);
      const testEntity = await enforceAsyncResult(
        TestEntity.creatorWithAuthorizationResults(viewerContext).createAsync(),
      );
      const testOtherEntity1 = await enforceAsyncResult(
        TestEntity.creatorWithAuthorizationResults(viewerContext)
          .setField('stringField', testEntity.getID())
          .createAsync(),
      );
      const testOtherEntity2 = await enforceAsyncResult(
        TestEntity.creatorWithAuthorizationResults(viewerContext)
          .setField('stringField', testEntity.getID())
          .createAsync(),
      );
      const loaded = await enforceResultsAsync(
        testEntity
          .associationLoaderWithAuthorizationResults()
          .loadManyAssociatedEntitiesAsync(TestEntity, 'stringField'),
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
        TestEntity.creatorWithAuthorizationResults(viewerContext).createAsync(),
      );
      const testEntity = await enforceAsyncResult(
        TestEntity.creatorWithAuthorizationResults(viewerContext)
          .setField('stringField', testOtherEntity.getID())
          .createAsync(),
      );
      const loadedOtherResult = await testEntity
        .associationLoaderWithAuthorizationResults()
        .loadAssociatedEntityByFieldEqualingAsync('stringField', TestEntity, 'customIdField');
      expect(loadedOtherResult?.enforceValue().getID()).toEqual(testOtherEntity.getID());
    });

    it('returns null when loading associated entities by field equaling a non existent association', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new TestViewerContext(companionProvider);
      const testEntity = await enforceAsyncResult(
        TestEntity.creatorWithAuthorizationResults(viewerContext)
          .setField('stringField', uuidv4())
          .createAsync(),
      );
      const loadedOtherResult = await testEntity
        .associationLoaderWithAuthorizationResults()
        .loadAssociatedEntityByFieldEqualingAsync('stringField', TestEntity, 'customIdField');
      expect(loadedOtherResult).toBeNull();
    });

    it('returns null when load-by field is null', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new TestViewerContext(companionProvider);
      const testEntity = await enforceAsyncResult(
        TestEntity.creatorWithAuthorizationResults(viewerContext)
          .setField('stringField', 'blah')
          .createAsync(),
      );
      const loadedOtherResult = await testEntity
        .associationLoaderWithAuthorizationResults()
        .loadAssociatedEntityByFieldEqualingAsync('nullableField', TestEntity, 'customIdField');
      expect(loadedOtherResult).toBeNull();
    });
  });

  describe('loadManyAssociatedEntitiesByFieldEqualingAsync', () => {
    it('loads many associated entities by field equaling', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new TestViewerContext(companionProvider);
      const testEntity = await enforceAsyncResult(
        TestEntity.creatorWithAuthorizationResults(viewerContext).createAsync(),
      );
      const testOtherEntity1 = await enforceAsyncResult(
        TestEntity.creatorWithAuthorizationResults(viewerContext)
          .setField('stringField', testEntity.getID())
          .createAsync(),
      );
      const testOtherEntity2 = await enforceAsyncResult(
        TestEntity.creatorWithAuthorizationResults(viewerContext)
          .setField('stringField', testEntity.getID())
          .createAsync(),
      );
      const loaded = await enforceResultsAsync(
        testEntity
          .associationLoaderWithAuthorizationResults()
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
        TestEntity.creatorWithAuthorizationResults(viewerContext).createAsync(),
      );
      const loaded = await enforceResultsAsync(
        testEntity
          .associationLoaderWithAuthorizationResults()
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
        TestEntity.creatorWithAuthorizationResults(viewerContext).createAsync(),
      );
      const testEntity3 = await enforceAsyncResult(
        TestEntity2.creatorWithAuthorizationResults(viewerContext)
          .setField('foreignKey', testEntity4.getID())
          .createAsync(),
      );
      const testEntity2 = await enforceAsyncResult(
        TestEntity.creatorWithAuthorizationResults(viewerContext)
          .setField('testIndexedField', testEntity3.getID())
          .createAsync(),
      );
      const testEntity = await enforceAsyncResult(
        TestEntity2.creatorWithAuthorizationResults(viewerContext)
          .setField('foreignKey', testEntity2.getID())
          .createAsync(),
      );

      const loaded2Result = await testEntity
        .associationLoaderWithAuthorizationResults()
        .loadAssociatedEntityThroughAsync([
          {
            associatedEntityClass: TestEntity,
            fieldIdentifyingAssociatedEntity: 'foreignKey',
          },
        ]);
      expect(loaded2Result?.enforceValue().getID()).toEqual(testEntity2.getID());

      const loaded3Result = await testEntity
        .associationLoaderWithAuthorizationResults()
        .loadAssociatedEntityThroughAsync([
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

      const loaded4Result = await testEntity
        .associationLoaderWithAuthorizationResults()
        .loadAssociatedEntityThroughAsync([
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
        TestEntity2.creatorWithAuthorizationResults(viewerContext)
          .setField('foreignKey', uuidv4())
          .createAsync(),
      );

      const loadResult = await testEntity
        .associationLoaderWithAuthorizationResults()
        .loadAssociatedEntityThroughAsync([
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
        TestEntity.creatorWithAuthorizationResults(viewerContext)
          .setField('stringField', fieldValue)
          .createAsync(),
      );
      const testEntity = await enforceAsyncResult(
        TestEntity2.creatorWithAuthorizationResults(viewerContext)
          .setField('foreignKey', fieldValue)
          .createAsync(),
      );

      const loaded2Result = await testEntity
        .associationLoaderWithAuthorizationResults()
        .loadAssociatedEntityThroughAsync([
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
        TestEntity2.creatorWithAuthorizationResults(viewerContext)
          .setField('foreignKey', uuidv4())
          .createAsync(),
      );

      const loaded2Result = await testEntity
        .associationLoaderWithAuthorizationResults()
        .loadAssociatedEntityThroughAsync([
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
        TestEntity.creatorWithAuthorizationResults(viewerContext)
          .setField('nullableField', null)
          .createAsync(),
      );

      const loadedResult = await testEntity
        .associationLoaderWithAuthorizationResults()
        .loadAssociatedEntityThroughAsync([
          {
            associatedEntityClass: TestEntity,
            fieldIdentifyingAssociatedEntity: 'nullableField',
          },
        ]);
      expect(loadedResult).toBeNull();
    });
  });
});

import { instance, mock } from 'ts-mockito';

import EntityAssociationLoader from '../EntityAssociationLoader';
import EntityLoader from '../EntityLoader';
import { EntityQueryContext } from '../EntityQueryContext';
import ReadonlyEntity from '../ReadonlyEntity';
import ViewerContext from '../ViewerContext';
import SimpleTestEntity from '../testfixtures/SimpleTestEntity';
import TestEntity from '../testfixtures/TestEntity';
import { createUnitTestEntityCompanionProvider } from '../utils/testing/createUnitTestEntityCompanionProvider';

describe(ReadonlyEntity, () => {
  describe('getID', () => {
    it('returns correct value', () => {
      const viewerContext = instance(mock(ViewerContext));
      const data = {
        id: 'what',
      };
      const testEntity = new SimpleTestEntity(viewerContext, data);
      expect(testEntity.getID()).toEqual('what');
    });
  });

  describe('toString', () => {
    it('returns correct value', () => {
      const viewerContext = instance(mock(ViewerContext));
      const data = {
        id: 'what',
      };
      const testEntity = new SimpleTestEntity(viewerContext, data);
      expect(testEntity.toString()).toEqual('SimpleTestEntity[what]');
    });
  });

  describe('getUniqueIdentifier', () => {
    it('returns a different value for two different entities of the same type', () => {
      const viewerContext = instance(mock(ViewerContext));
      const testEntity = new SimpleTestEntity(viewerContext, {
        id: '1',
      });
      const testEntity2 = new SimpleTestEntity(viewerContext, {
        id: '2',
      });
      expect(testEntity.getUniqueIdentifier()).not.toEqual(testEntity2.getUniqueIdentifier());
    });

    it('returns the same value even if different viewer context', () => {
      const viewerContext = instance(mock(ViewerContext));
      const viewerContext2 = instance(mock(ViewerContext));
      const data = { id: '1' };
      const testEntity = new SimpleTestEntity(viewerContext, data);
      const testEntity2 = new SimpleTestEntity(viewerContext2, data);
      expect(testEntity.getUniqueIdentifier()).toEqual(testEntity2.getUniqueIdentifier());
    });

    it('returns a different value for different entities even if same ID', () => {
      const viewerContext = instance(mock(ViewerContext));
      const data = { id: '1' };
      const testEntity = new SimpleTestEntity(viewerContext, data);
      const testEntity2 = new TestEntity(viewerContext, {
        customIdField: '1',
        testIndexedField: '2',
        stringField: '3',
        numberField: 4,
        dateField: new Date(),
      });
      expect(testEntity.getUniqueIdentifier()).not.toEqual(testEntity2.getUniqueIdentifier());
    });
  });

  it('cannot be created without an ID', () => {
    const viewerContext = instance(mock(ViewerContext));
    const dataWithoutID = {};
    expect(() => {
      new SimpleTestEntity(viewerContext, dataWithoutID as any); // eslint-disable-line no-new
    }).toThrow();
  });

  it('returns correct viewerContext from instantiation', () => {
    const viewerContext = instance(mock(ViewerContext));
    const data = {
      id: 'what',
    };
    const testEntity = new SimpleTestEntity(viewerContext, data);
    expect(testEntity.getViewerContext()).toBe(viewerContext);
  });

  it('returns correct data for field getters', () => {
    const viewerContext = instance(mock(ViewerContext));
    const data = {
      id: 'what',
    };
    const testEntity = new SimpleTestEntity(viewerContext, data);
    expect(testEntity.getField('id')).toEqual('what');
    expect(testEntity.getAllFields()).toEqual(data);
  });

  describe('associationLoader', () => {
    it('returns a new association loader', () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);
      const data = {
        id: 'what',
      };
      const testEntity = new SimpleTestEntity(viewerContext, data);
      expect(testEntity.associationLoader()).toBeInstanceOf(EntityAssociationLoader);
    });
  });

  describe('getRegularEntityQueryContext', () => {
    it('creates a new regular query context', () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);
      const queryContext = SimpleTestEntity.getQueryContext(viewerContext);
      expect(queryContext).toBeInstanceOf(EntityQueryContext);
      expect(queryContext.isInTransaction()).toBe(false);
    });
  });

  describe('runInTransactionAsync', () => {
    it('creates a new transactional query context', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);
      const didCreateTransaction = await SimpleTestEntity.runInTransactionAsync(
        viewerContext,
        async (queryContext) => {
          return queryContext.isInTransaction();
        }
      );
      expect(didCreateTransaction).toBe(true);
    });
  });

  describe('loader', () => {
    it('creates a new EntityLoader', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);
      expect(SimpleTestEntity.loader(viewerContext)).toBeInstanceOf(EntityLoader);
    });
  });
});

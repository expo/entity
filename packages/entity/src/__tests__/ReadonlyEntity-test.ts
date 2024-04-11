import { instance, mock } from 'ts-mockito';

import EntityAssociationLoader from '../EntityAssociationLoader';
import EntityLoader from '../EntityLoader';
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
      const testEntity = new SimpleTestEntity({
        viewerContext,
        id: 'what',
        databaseFields: data,
        selectedFields: data,
      });
      expect(testEntity.getID()).toEqual('what');
    });
  });

  describe('toString', () => {
    it('returns correct value', () => {
      const viewerContext = instance(mock(ViewerContext));
      const data = {
        id: 'what',
      };
      const testEntity = new SimpleTestEntity({
        viewerContext,
        id: 'what',
        databaseFields: data,
        selectedFields: data,
      });
      expect(testEntity.toString()).toEqual('SimpleTestEntity[what]');
    });
  });

  describe('getUniqueIdentifier', () => {
    it('returns a different value for two different entities of the same type', () => {
      const viewerContext = instance(mock(ViewerContext));
      const testEntity = new SimpleTestEntity({
        viewerContext,
        id: '1',
        databaseFields: {
          id: '1',
        },
        selectedFields: {
          id: '1',
        },
      });
      const testEntity2 = new SimpleTestEntity({
        viewerContext,
        id: '2',
        databaseFields: {
          id: '2',
        },
        selectedFields: {
          id: '2',
        },
      });
      expect(testEntity.getUniqueIdentifier()).not.toEqual(testEntity2.getUniqueIdentifier());
    });

    it('returns the same value even if different viewer context', () => {
      const viewerContext = instance(mock(ViewerContext));
      const viewerContext2 = instance(mock(ViewerContext));
      const data = { id: '1' };
      const testEntity = new SimpleTestEntity({
        viewerContext,
        id: '1',
        databaseFields: data,
        selectedFields: data,
      });
      const testEntity2 = new SimpleTestEntity({
        viewerContext: viewerContext2,
        id: '1',
        databaseFields: data,
        selectedFields: data,
      });
      expect(testEntity.getUniqueIdentifier()).toEqual(testEntity2.getUniqueIdentifier());
    });

    it('returns a different value for different entities even if same ID', () => {
      const viewerContext = instance(mock(ViewerContext));
      const data = { id: '1' };
      const testEntity = new SimpleTestEntity({
        viewerContext,
        id: 'what',
        databaseFields: data,
        selectedFields: data,
      });
      const data2 = {
        customIdField: '1',
        testIndexedField: '2',
        stringField: '3',
        intField: 4,
        dateField: new Date(),
        nullableField: null,
      };
      const testEntity2 = new TestEntity({
        viewerContext,
        id: '1',
        databaseFields: data2,
        selectedFields: data2,
      });
      expect(testEntity.getUniqueIdentifier()).not.toEqual(testEntity2.getUniqueIdentifier());
    });
  });

  it('cannot be created without an ID', () => {
    const viewerContext = instance(mock(ViewerContext));
    const dataWithoutID = {};
    expect(() => {
      // eslint-disable-next-line no-new
      new SimpleTestEntity({
        viewerContext,
        id: undefined as any,
        databaseFields: dataWithoutID as any,
        selectedFields: dataWithoutID as any,
      });
    }).toThrow();
  });

  it('returns correct viewerCo}ntext from instantiation', () => {
    const viewerContext = instance(mock(ViewerContext));
    const data = {
      id: 'what',
    };
    const testEntity = new SimpleTestEntity({
      viewerContext,
      id: 'what',
      databaseFields: data,
      selectedFields: data,
    });
    expect(testEntity.getViewerContext()).toBe(viewerContext);
  });

  it('returns correct data for field getters', () => {
    const viewerContext = instance(mock(ViewerContext));
    const data = {
      id: 'what',
    };
    const testEntity = new SimpleTestEntity({
      viewerContext,
      id: 'what',
      databaseFields: data,
      selectedFields: data,
    });
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
      const testEntity = new SimpleTestEntity({
        viewerContext,
        id: 'what',
        databaseFields: data,
        selectedFields: data,
      });
      expect(testEntity.associationLoader()).toBeInstanceOf(EntityAssociationLoader);
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

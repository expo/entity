import { instance, mock } from 'ts-mockito';

import EntityAssociationLoader from '../EntityAssociationLoader';
import ReadonlyEntity from '../ReadonlyEntity';
import ViewerContext from '../ViewerContext';
import SimpleTestEntity from '../testfixtures/SimpleTestEntity';

describe(ReadonlyEntity, () => {
  it('returns correct ID', () => {
    const viewerContext = instance(mock(ViewerContext));
    const data = {
      id: 'what',
    };
    const testEntity = new SimpleTestEntity(viewerContext, data);
    expect(testEntity.getID()).toEqual('what');
  });

  it('returns correct toString', () => {
    const viewerContext = instance(mock(ViewerContext));
    const data = {
      id: 'what',
    };
    const testEntity = new SimpleTestEntity(viewerContext, data);
    expect(testEntity.toString()).toEqual('SimpleTestEntity[what]');
  });

  it('cannot create instance without ID', () => {
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

  it('returns a new association loader', () => {
    const viewerContext = instance(mock(ViewerContext));
    const data = {
      id: 'what',
    };
    const testEntity = new SimpleTestEntity(viewerContext, data);
    expect(testEntity.associationLoader()).toBeInstanceOf(EntityAssociationLoader);
  });
});

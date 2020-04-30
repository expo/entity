import { mock, verify, instance } from 'ts-mockito';

import EntityLoaderFactory from '../EntityLoaderFactory';
import { EntityQueryContext } from '../EntityQueryContext';
import ViewerContext from '../ViewerContext';
import ViewerScopedEntityLoaderFactory from '../ViewerScopedEntityLoaderFactory';

describe(ViewerScopedEntityLoaderFactory, () => {
  it('correctly scopes viewer to entity loads', async () => {
    const viewerContext = instance(mock(ViewerContext));
    const queryContext = instance(mock(EntityQueryContext));
    const baseLoader = mock<EntityLoaderFactory<any, any, any, any, any>>(EntityLoaderFactory);
    const baseLoaderInstance = instance(baseLoader);

    const viewerScopedEntityLoader = new ViewerScopedEntityLoaderFactory<any, any, any, any, any>(
      baseLoaderInstance,
      viewerContext
    );

    viewerScopedEntityLoader.forLoad(queryContext);

    verify(baseLoader.forLoad(viewerContext, queryContext)).once();
  });
});

import { describe, it } from '@jest/globals';
import { instance, mock, verify } from 'ts-mockito';

import { EntityLoaderFactory } from '../EntityLoaderFactory.ts';
import type { EntityPrivacyPolicyEvaluationContext } from '../EntityPrivacyPolicy.ts';
import { EntityQueryContext } from '../EntityQueryContext.ts';
import { ViewerContext } from '../ViewerContext.ts';
import { ViewerScopedEntityLoaderFactory } from '../ViewerScopedEntityLoaderFactory.ts';

describe(ViewerScopedEntityLoaderFactory, () => {
  it('correctly scopes viewer to entity loads', async () => {
    const viewerContext = instance(mock(ViewerContext));
    const privacyPolicyEvaluationContext =
      instance(mock<EntityPrivacyPolicyEvaluationContext<any, any, any, any, any>>());
    const queryContext = instance(mock(EntityQueryContext));
    const baseLoader = mock<EntityLoaderFactory<any, any, any, any, any, any>>(EntityLoaderFactory);
    const baseLoaderInstance = instance(baseLoader);

    const viewerScopedEntityLoader = new ViewerScopedEntityLoaderFactory<
      any,
      any,
      any,
      any,
      any,
      any
    >(baseLoaderInstance, viewerContext);

    viewerScopedEntityLoader.forLoad(queryContext, privacyPolicyEvaluationContext);

    verify(baseLoader.forLoad(viewerContext, queryContext, privacyPolicyEvaluationContext)).once();
  });
});

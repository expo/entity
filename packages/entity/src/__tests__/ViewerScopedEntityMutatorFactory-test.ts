import { describe, it } from '@jest/globals';
import { instance, mock, verify } from 'ts-mockito';

import { EntityMutatorFactory } from '../EntityMutatorFactory.ts';
import { EntityQueryContext } from '../EntityQueryContext.ts';
import { ViewerContext } from '../ViewerContext.ts';
import { ViewerScopedEntityMutatorFactory } from '../ViewerScopedEntityMutatorFactory.ts';
import type {
  TestEntity,
  TestEntityPrivacyPolicy,
  TestFields,
} from '../utils/__testfixtures__/TestEntity.ts';

describe(ViewerScopedEntityMutatorFactory, () => {
  it('correctly scopes viewer to entity mutations', async () => {
    const viewerContext = instance(mock(ViewerContext));
    const queryContext = instance(mock(EntityQueryContext));
    const baseMutatorFactory =
      mock<
        EntityMutatorFactory<
          TestFields,
          'customIdField',
          ViewerContext,
          TestEntity,
          TestEntityPrivacyPolicy
        >
      >(EntityMutatorFactory);
    const baseMutatorFactoryInstance = instance(baseMutatorFactory);

    const viewerScopedEntityLoader = new ViewerScopedEntityMutatorFactory<
      TestFields,
      'customIdField',
      ViewerContext,
      TestEntity,
      TestEntityPrivacyPolicy,
      keyof TestFields
    >(baseMutatorFactoryInstance, viewerContext);

    viewerScopedEntityLoader.forCreate(queryContext);

    verify(baseMutatorFactory.forCreate(viewerContext, queryContext)).once();
  });
});

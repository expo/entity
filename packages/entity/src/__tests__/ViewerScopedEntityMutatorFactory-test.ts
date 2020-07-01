import { mock, instance, verify } from 'ts-mockito';

import EntityMutatorFactory from '../EntityMutatorFactory';
import { EntityQueryContext } from '../EntityQueryContext';
import ViewerContext from '../ViewerContext';
import ViewerScopedEntityMutatorFactory from '../ViewerScopedEntityMutatorFactory';
import TestEntity, { TestFields, TestEntityPrivacyPolicy } from '../testfixtures/TestEntity';

describe(ViewerScopedEntityMutatorFactory, () => {
  it('correctly scopes viewer to entity mutations', async () => {
    const viewerContext = instance(mock(ViewerContext));
    const queryContext = instance(mock(EntityQueryContext));
    const baseMutatorFactory = mock<
      EntityMutatorFactory<TestFields, string, ViewerContext, TestEntity, TestEntityPrivacyPolicy>
    >(EntityMutatorFactory);
    const baseMutatorFactoryInstance = instance(baseMutatorFactory);

    const viewerScopedEntityLoader = new ViewerScopedEntityMutatorFactory<
      TestFields,
      string,
      ViewerContext,
      TestEntity,
      TestEntityPrivacyPolicy,
      keyof TestFields
    >(baseMutatorFactoryInstance, viewerContext);

    viewerScopedEntityLoader.forCreate(queryContext);

    verify(baseMutatorFactory.forCreate(viewerContext, queryContext)).once();
  });
});

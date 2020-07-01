import { mock, instance } from 'ts-mockito';

import EntityCompanion from '../EntityCompanion';
import ViewerContext from '../ViewerContext';
import ViewerScopedEntityCompanion from '../ViewerScopedEntityCompanion';
import ViewerScopedEntityLoaderFactory from '../ViewerScopedEntityLoaderFactory';
import ViewerScopedEntityMutatorFactory from '../ViewerScopedEntityMutatorFactory';
import TestEntity, { TestFields, TestEntityPrivacyPolicy } from '../testfixtures/TestEntity';

describe(ViewerScopedEntityCompanion, () => {
  it('returns viewer scoped loader and mutator factory', () => {
    const vc = instance(mock(ViewerContext));
    const entityCompanion = mock<
      EntityCompanion<
        TestFields,
        string,
        ViewerContext,
        TestEntity,
        TestEntityPrivacyPolicy,
        keyof TestFields
      >
    >();
    const viewerScopedEntityCompanion = new ViewerScopedEntityCompanion(entityCompanion, vc);
    expect(viewerScopedEntityCompanion.getLoaderFactory()).toBeInstanceOf(
      ViewerScopedEntityLoaderFactory
    );
    expect(viewerScopedEntityCompanion.getMutatorFactory()).toBeInstanceOf(
      ViewerScopedEntityMutatorFactory
    );
  });
});

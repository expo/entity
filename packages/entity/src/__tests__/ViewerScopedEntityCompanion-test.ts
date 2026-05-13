import { describe, expect, it } from '@jest/globals';
import { instance, mock, when } from 'ts-mockito';

import type { EntityCompanion } from '../EntityCompanion.ts';
import { EntityMutatorFactory } from '../EntityMutatorFactory.ts';
import { ViewerContext } from '../ViewerContext.ts';
import { ViewerScopedEntityCompanion } from '../ViewerScopedEntityCompanion.ts';
import { ViewerScopedEntityLoaderFactory } from '../ViewerScopedEntityLoaderFactory.ts';
import type {
  TestEntity,
  TestEntityPrivacyPolicy,
  TestFields,
} from '../utils/__testfixtures__/TestEntity.ts';

describe(ViewerScopedEntityCompanion, () => {
  it('returns viewer scoped loader and mutator factory', () => {
    const vc = instance(mock(ViewerContext));
    const entityCompanionMock =
      mock<
        EntityCompanion<
          TestFields,
          'customIdField',
          ViewerContext,
          TestEntity,
          TestEntityPrivacyPolicy,
          keyof TestFields
        >
      >();
    const entityMutatorFactory =
      instance(
        mock<
          EntityMutatorFactory<
            TestFields,
            'customIdField',
            ViewerContext,
            TestEntity,
            TestEntityPrivacyPolicy,
            keyof TestFields
          >
        >(),
      );
    when(entityCompanionMock.getMutatorFactory()).thenReturn(entityMutatorFactory);

    const viewerScopedEntityCompanion = new ViewerScopedEntityCompanion(
      instance(entityCompanionMock),
      vc,
    );
    expect(viewerScopedEntityCompanion.getLoaderFactory()).toBeInstanceOf(
      ViewerScopedEntityLoaderFactory,
    );
    expect(viewerScopedEntityCompanion.getMutatorFactory()).toBe(entityMutatorFactory);
    expect(viewerScopedEntityCompanion.getMetricsAdapter()).toBeDefined();
  });
});

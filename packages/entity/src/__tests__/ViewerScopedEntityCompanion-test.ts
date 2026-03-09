import { describe, expect, it } from '@jest/globals';
import { instance, mock } from 'ts-mockito';

import type { EntityCompanion } from '../EntityCompanion.ts';
import { ViewerContext } from '../ViewerContext.ts';
import { ViewerScopedEntityCompanion } from '../ViewerScopedEntityCompanion.ts';
import { ViewerScopedEntityLoaderFactory } from '../ViewerScopedEntityLoaderFactory.ts';
import { ViewerScopedEntityMutatorFactory } from '../ViewerScopedEntityMutatorFactory.ts';
import type {
  TestEntity,
  TestEntityPrivacyPolicy,
  TestFields,
} from '../utils/__testfixtures__/TestEntity.ts';

describe(ViewerScopedEntityCompanion, () => {
  it('returns viewer scoped loader and mutator factory', () => {
    const vc = instance(mock(ViewerContext));
    const entityCompanion =
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
    const viewerScopedEntityCompanion = new ViewerScopedEntityCompanion(entityCompanion, vc);
    expect(viewerScopedEntityCompanion.getLoaderFactory()).toBeInstanceOf(
      ViewerScopedEntityLoaderFactory,
    );
    expect(viewerScopedEntityCompanion.getMutatorFactory()).toBeInstanceOf(
      ViewerScopedEntityMutatorFactory,
    );
    expect(viewerScopedEntityCompanion.getMetricsAdapter()).toBeDefined();
  });
});

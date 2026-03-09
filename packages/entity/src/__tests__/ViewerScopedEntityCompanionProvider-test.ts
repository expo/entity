import { describe, expect, it } from '@jest/globals';
import { instance, mock } from 'ts-mockito';

import { EntityCompanionProvider } from '../EntityCompanionProvider.ts';
import { ViewerContext } from '../ViewerContext.ts';
import { ViewerScopedEntityCompanion } from '../ViewerScopedEntityCompanion.ts';
import { ViewerScopedEntityCompanionProvider } from '../ViewerScopedEntityCompanionProvider.ts';
import { TestEntity } from '../utils/__testfixtures__/TestEntity.ts';

describe(ViewerScopedEntityCompanionProvider, () => {
  it('returns viewer scoped entity companion', () => {
    const vc = instance(mock(ViewerContext));
    const entityCompanionProvider = instance(mock(EntityCompanionProvider));
    const viewerScopedEntityCompanionProvider = new ViewerScopedEntityCompanionProvider(
      entityCompanionProvider,
      vc,
    );
    expect(
      viewerScopedEntityCompanionProvider.getViewerScopedCompanionForEntity(TestEntity),
    ).toBeInstanceOf(ViewerScopedEntityCompanion);
  });
});

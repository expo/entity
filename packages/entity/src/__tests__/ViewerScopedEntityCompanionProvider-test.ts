import { describe, expect, it } from '@jest/globals';
import { instance, mock } from 'ts-mockito';

import { EntityCompanionProvider } from '../EntityCompanionProvider';
import { ViewerContext } from '../ViewerContext';
import { ViewerScopedEntityCompanion } from '../ViewerScopedEntityCompanion';
import { ViewerScopedEntityCompanionProvider } from '../ViewerScopedEntityCompanionProvider';
import { TestEntity } from '../utils/__testfixtures__/TestEntity';

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

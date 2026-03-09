import { EntityCompanionProvider, ViewerContext } from '@expo/entity';
import { describe, expect, it } from '@jest/globals';

import { TestEntity } from '../__testfixtures__/TestEntity.ts';
import { createUnitTestPostgresEntityCompanionProvider } from '../createUnitTestPostgresEntityCompanionProvider.ts';

describe(createUnitTestPostgresEntityCompanionProvider, () => {
  it('creates a new EntityCompanionProvider', async () => {
    const companionProvider = createUnitTestPostgresEntityCompanionProvider();
    expect(companionProvider).toBeInstanceOf(EntityCompanionProvider);
    const viewerContext = new ViewerContext(companionProvider);
    await expect(TestEntity.creator(viewerContext).createAsync()).resolves.toBeInstanceOf(
      TestEntity,
    );
  });
});

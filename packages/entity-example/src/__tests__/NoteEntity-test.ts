import { createUnitTestEntityCompanionProvider } from '@expo/entity';

import NoteEntity from '../entities/NoteEntity';
import { UserViewerContext } from '../viewerContexts';

describe(NoteEntity, () => {
  test('demonstrate usage of business logic test utilities', async () => {
    const companionProvider = createUnitTestEntityCompanionProvider();
    const viewerContext = new UserViewerContext(companionProvider, '4');

    const createdEntityResult = await NoteEntity.creator(viewerContext)
      .setField('userID', '4')
      .setField('body', 'image')
      .setField('title', 'page')
      .createAsync();
    expect(createdEntityResult.ok).toBe(true);

    const createdEntityResultImpersonate = await NoteEntity.creator(viewerContext)
      .setField('userID', '5')
      .setField('body', 'image')
      .setField('title', 'page')
      .createAsync();
    expect(createdEntityResultImpersonate.ok).toBe(false);
  });
});

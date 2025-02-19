import { createUnitTestEntityCompanionProvider } from '@expo/entity';
import { v4 as uuidv4 } from 'uuid';

import NoteEntity from '../entities/NoteEntity';
import { UserViewerContext } from '../viewerContexts';

describe(NoteEntity, () => {
  test('demonstrate usage of business logic test utilities', async () => {
    const companionProvider = createUnitTestEntityCompanionProvider();
    const userId = uuidv4();
    const viewerContext = new UserViewerContext(companionProvider, userId);

    const createdEntityResult = await NoteEntity.creator(viewerContext)
      .withAuthorizationResults()
      .setField('userID', userId)
      .setField('body', 'image')
      .setField('title', 'page')
      .createAsync();
    expect(createdEntityResult.ok).toBe(true);

    const createdEntityResultImpersonate = await NoteEntity.creator(viewerContext)
      .withAuthorizationResults()
      .setField('userID', uuidv4()) // a different user
      .setField('body', 'image')
      .setField('title', 'page')
      .createAsync();
    expect(createdEntityResultImpersonate.ok).toBe(false);
  });
});

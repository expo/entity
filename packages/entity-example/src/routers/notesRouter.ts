import KoaRouter from 'koa-router';

import { ExampleState, ExampleContext } from '../app';
import NoteEntity from '../entities/NoteEntity';

/**
 * A simple REST API for the notes resource:
 * GET /notes/ - get all notes for logged-in user, or empty for anonymous
 * GET /notes/:id - get a note
 * POST /notes/ - create a new note for logged-in user
 * PUT /notes/:id - update a note
 * DELETE /notes/:id - delete a note
 */
const router = new KoaRouter<ExampleState>({
  prefix: '/notes',
});

router.get('/', async (ctx: ExampleContext) => {
  const viewerContext = ctx.state.viewerContext;
  let notes: readonly NoteEntity[] = [];
  if (viewerContext.isUserViewerContext()) {
    notes = await NoteEntity.loader(viewerContext).loadManyByFieldEqualingAsync(
      'userID',
      viewerContext.userID
    );
  }
  ctx.body = {
    notes: notes.map((note) => note.getAllFields()),
  };
});

router.get('/:id', async (ctx: ExampleContext) => {
  const viewerContext = ctx.state.viewerContext;
  const noteResult = await NoteEntity.loader(viewerContext).loadByIDAsync(ctx.params.id);
  if (!noteResult.ok) {
    ctx.throw(403, noteResult.reason);
  }

  ctx.body = {
    note: noteResult.value.getAllFields(),
  };
});

router.post('/', async (ctx: ExampleContext) => {
  const viewerContext = ctx.state.viewerContext;
  if (!viewerContext.isUserViewerContext()) {
    // Only logged-in users can create notes. Technically this
    // would be handled by the privacy policy (it would fail)
    // but we throw here for better type safety.
    ctx.throw(403);
  }

  const { title, body } = ctx.request.body;

  const createResult = await NoteEntity.creator(viewerContext)
    .setField('userID', viewerContext.userID)
    .setField('title', title)
    .setField('body', body)
    .createAsync();
  if (!createResult.ok) {
    ctx.throw(403, createResult.reason);
  }

  ctx.body = {
    note: createResult.value.getAllFields(),
  };
});

router.put('/:id', async (ctx: ExampleContext) => {
  const viewerContext = ctx.state.viewerContext;
  const { title, body } = ctx.request.body;

  const noteLoadResult = await NoteEntity.loader(viewerContext).loadByIDAsync(ctx.params.id);
  if (!noteLoadResult.ok) {
    ctx.throw(403, noteLoadResult.reason);
  }

  const noteUpdateResult = await NoteEntity.updater(noteLoadResult.value)
    .setField('title', title)
    .setField('body', body)
    .updateAsync();
  if (!noteUpdateResult.ok) {
    ctx.throw(403, noteUpdateResult.reason);
  }

  ctx.body = {
    note: noteUpdateResult.value.getAllFields(),
  };
});

router.delete('/:id', async (ctx: ExampleContext) => {
  const viewerContext = ctx.state.viewerContext;

  const noteLoadResult = await NoteEntity.loader(viewerContext).loadByIDAsync(ctx.params.id);
  if (!noteLoadResult.ok) {
    ctx.throw(403, noteLoadResult.reason);
  }

  const noteDeleteResult = await NoteEntity.deleteAsync(noteLoadResult.value);
  if (!noteDeleteResult.ok) {
    ctx.throw(403, noteDeleteResult.reason);
  }

  ctx.body = {
    status: 'ok',
  };
});

export default router;

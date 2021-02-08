import http from 'http';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import app from '../app';

describe('notesRouter', () => {
  it('returns empty array for logged-out', async () => {
    const response = await request(http.createServer(app.callback())).get('/notes/').send();
    expect(response.body.notes).toEqual([]);
  });

  it('allows CRUD of user notes', async () => {
    const server = request(http.createServer(app.callback()));

    const userId = uuidv4();

    const responseEmpty = await server.get('/notes/').set('totally-secure-user-id', userId).send();
    expect(responseEmpty.body.notes).toEqual([]);

    const createResponse1 = await server
      .post('/notes/')
      .set('totally-secure-user-id', userId)
      .send({
        title: 'track',
        body: 'language',
      });
    expect(createResponse1.body.note).toMatchObject({
      userID: userId,
      title: 'track',
      body: 'language',
    });

    const createResponse2 = await server
      .post('/notes/')
      .set('totally-secure-user-id', userId)
      .send({
        title: 'nine',
        body: 'lotion',
      });

    const responseLength2 = await server
      .get('/notes/')
      .set('totally-secure-user-id', userId)
      .send();
    expect(responseLength2.body.notes).toHaveLength(2);

    const responseGetSingle = await server
      .get(`/notes/${createResponse2.body.note.id}`)
      .set('totally-secure-user-id', userId)
      .send();
    expect(responseGetSingle.body.note).toMatchObject({
      id: createResponse2.body.note.id,
      userID: userId,
      title: 'nine',
      body: 'lotion',
    });

    const responseUpdateSingle = await server
      .put(`/notes/${createResponse2.body.note.id}`)
      .set('totally-secure-user-id', userId)
      .send({
        title: 'wave',
        body: 'boarding',
      });
    expect(responseUpdateSingle.body.note).toMatchObject({
      id: responseGetSingle.body.note.id,
      userID: userId,
      title: 'wave',
      body: 'boarding',
    });

    const responseDeleteSingle = await server
      .delete(`/notes/${createResponse2.body.note.id}`)
      .set('totally-secure-user-id', userId)
      .send();
    expect(responseDeleteSingle.body.status).toEqual('ok');

    const responseLength1 = await server
      .get('/notes/')
      .set('totally-secure-user-id', userId)
      .send();
    expect(responseLength1.body.notes).toHaveLength(1);
  });

  it('disallows anonymous note creation', async () => {
    const server = request(http.createServer(app.callback()));
    const createResponse1 = await server.post('/notes/').send({
      title: 'track',
      body: 'language',
    });
    expect(createResponse1.ok).toBe(false);
    expect(createResponse1.status).toEqual(403);
  });

  it('disallows cross-user note impersonation', async () => {
    const server = request(http.createServer(app.callback()));
    const userId = uuidv4();
    const userId2 = uuidv4();
    const createResponse1 = await server
      .post('/notes/')
      .set('totally-secure-user-id', userId)
      .send({
        title: 'track',
        body: 'language',
      });
    expect(createResponse1.ok).toBe(true);

    // notes are public
    const responseGetSingleOtherUser = await server
      .get(`/notes/${createResponse1.body.note.id}`)
      .set('totally-secure-user-id', userId2)
      .send();
    expect(responseGetSingleOtherUser.ok).toBe(true);

    // but can only be updated by the owner
    const responseUpdateSingle = await server
      .put(`/notes/${createResponse1.body.note.id}`)
      .set('totally-secure-user-id', userId2)
      .send({
        title: 'wave',
        body: 'boarding',
      });
    expect(responseUpdateSingle.ok).toBe(false);
    expect(responseUpdateSingle.status).toEqual(403);
  });
});

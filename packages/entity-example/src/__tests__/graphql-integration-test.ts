import http from 'http';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import createAppAsync from '../app';

describe('graphql', () => {
  it('allows CRUD of user notes', async () => {
    const app = await createAppAsync();
    const server = request(http.createServer(app.callback()));

    const userId = uuidv4();
    const responseEmpty = await server.post('/graphql').set('totally-secure-user-id', userId).send({
      query: `query { me { notes { id } } }`,
    });
    expect(responseEmpty.body.data.me.notes).toEqual([]);

    const createResponse1 = await server
      .post('/graphql')
      .set('totally-secure-user-id', userId)
      .send({
        query: `mutation($note: NoteInput!) { addNote(note: $note) { id, title, body } }`,
        variables: {
          note: {
            title: 'track',
            body: 'language',
          },
        },
      });
    expect(createResponse1.body.data.addNote).toMatchObject({
      title: 'track',
      body: 'language',
    });

    const createResponse2 = await server
      .post('/graphql')
      .set('totally-secure-user-id', userId)
      .send({
        query: `mutation($note: NoteInput!) { addNote(note: $note) { id, title, body } }`,
        variables: {
          note: {
            title: 'nine',
            body: 'lotion',
          },
        },
      });

    const responseLength2 = await server
      .post('/graphql')
      .set('totally-secure-user-id', userId)
      .send({
        query: `query { me { notes { id } } }`,
      });
    expect(responseLength2.body.data.me.notes).toHaveLength(2);

    const responseGetSingle = await server
      .post('/graphql')
      .set('totally-secure-user-id', userId)
      .send({
        query: `query($id: ID!) { noteByID(id: $id) { id, title, body } }`,
        variables: {
          id: createResponse2.body.data.addNote.id,
        },
      });
    expect(responseGetSingle.body.data.noteByID).toMatchObject({
      id: createResponse2.body.data.addNote.id,
      title: 'nine',
      body: 'lotion',
    });

    const responseUpdateSingle = await server
      .post('/graphql')
      .set('totally-secure-user-id', userId)
      .send({
        query: `mutation($id: ID!, $note: NoteInput!) { updateNote(id: $id, note: $note) { id, title, body } }`,
        variables: {
          id: createResponse2.body.data.addNote.id,
          note: {
            title: 'wave',
            body: 'boarding',
          },
        },
      });

    expect(responseUpdateSingle.body.data.updateNote).toMatchObject({
      id: createResponse2.body.data.addNote.id,
      title: 'wave',
      body: 'boarding',
    });

    const responseDeleteSingle = await server
      .post('/graphql')
      .set('totally-secure-user-id', userId)
      .send({
        query: `mutation($id: ID!) { deleteNote(id: $id) { id, title, body } }`,
        variables: {
          id: createResponse2.body.data.addNote.id,
          note: {
            title: 'wave',
            body: 'boarding',
          },
        },
      });

    expect(responseDeleteSingle.body.data.deleteNote).toMatchObject({
      id: createResponse2.body.data.addNote.id,
      title: 'wave',
      body: 'boarding',
    });

    const responseLength1 = await server
      .post('/graphql')
      .set('totally-secure-user-id', userId)
      .send({
        query: `query { me { notes { id } } }`,
      });
    expect(responseLength1.body.data.me.notes).toHaveLength(1);
  });

  it('disallows anonymous note creation', async () => {
    const app = await createAppAsync();
    const server = request(http.createServer(app.callback()));
    const createResponse1 = await server.post('/graphql').send({
      query: `mutation($note: NoteInput!) { addNote(note: $note) { id, title, body } }`,
      variables: {
        note: {
          title: 'track',
          body: 'language',
        },
      },
    });

    expect(createResponse1.body.data.addNote).toBeNull();
    expect(createResponse1.body.errors).toHaveLength(1);
  });

  it('disallows cross-user note impersonation', async () => {
    const app = await createAppAsync();
    const server = request(http.createServer(app.callback()));

    const userId = uuidv4();
    const userId2 = uuidv4();
    const createResponse1 = await server
      .post('/graphql')
      .set('totally-secure-user-id', userId)
      .send({
        query: `mutation($note: NoteInput!) { addNote(note: $note) { id, title, body } }`,
        variables: {
          note: {
            title: 'track',
            body: 'language',
          },
        },
      });

    // notes are public
    const responseGetSingle = await server
      .post('/graphql')
      .set('totally-secure-user-id', userId2)
      .send({
        query: `query($id: ID!) { noteByID(id: $id) { id, title, body } }`,
        variables: {
          id: createResponse1.body.data.addNote.id,
        },
      });
    expect(responseGetSingle.body.data.noteByID).toMatchObject({
      id: createResponse1.body.data.addNote.id,
      title: 'track',
      body: 'language',
    });

    // but can only be updated by the owner
    const responseUpdateSingle = await server
      .post('/graphql')
      .set('totally-secure-user-id', userId2)
      .send({
        query: `mutation($id: ID!, $note: NoteInput!) { updateNote(id: $id, note: $note) { id, title, body } }`,
        variables: {
          id: createResponse1.body.data.addNote.id,
          note: {
            title: 'wave',
            body: 'boarding',
          },
        },
      });

    expect(responseUpdateSingle.body.data.updateNote).toBeNull();
    expect(responseUpdateSingle.body.errors).toHaveLength(1);
  });
});

import { IResolvers, IObjectTypeResolver } from '@graphql-tools/utils';

import NoteEntity from './entities/NoteEntity';
import { ExampleViewerContext } from './viewerContexts';

type GraphqlContext = {
  viewerContext: ExampleViewerContext;
};

export const typeDefs = `#graphql
  type User {
    id: ID!
    notes: [Note]!
  }

  type Note {
    id: ID!
    title: String!
    body: String!
    user: User!
  }

  type Query {
    me: User
    noteByID(id: ID): Note
  }

  input NoteInput {
    title: String!
    body: String!
  }

  type Mutation {
    addNote(note: NoteInput!): Note
    updateNote(id: ID, note: NoteInput!): Note
    deleteNote(id: ID): Note
  }
`;

export const resolvers: IResolvers<any, GraphqlContext> = {
  Query: {
    me(_root, _args, { viewerContext }) {
      if (!viewerContext.isUserViewerContext()) {
        return null;
      }
      return viewerContext.userID;
    },
    async noteByID(_root, args, { viewerContext }) {
      return await NoteEntity.loader(viewerContext).loadByIDAsync(args.id);
    },
  } as IObjectTypeResolver<any, GraphqlContext>,

  User: {
    id: (root) => root,
    async notes(root, _args, { viewerContext }) {
      return await NoteEntity.loader(viewerContext).loadManyByFieldEqualingAsync('userID', root);
    },
  } as IObjectTypeResolver<string, GraphqlContext>,

  Note: {
    id: (root) => root.getID(),
    title: (root) => root.getField('title'),
    body: (root) => root.getField('body'),
    user: (root) => root.getField('userID'),
  } as IObjectTypeResolver<NoteEntity, GraphqlContext>,

  Mutation: {
    async addNote(_root, args, { viewerContext }) {
      if (!viewerContext.isUserViewerContext()) {
        throw new Error('not logged in');
      }

      return await NoteEntity.creator(viewerContext)
        .setField('userID', viewerContext.userID)
        .setField('title', args.note.title)
        .setField('body', args.note.body)
        .createAsync();
    },
    async updateNote(_root, args, { viewerContext }) {
      const existingNote = await NoteEntity.loader(viewerContext).loadByIDAsync(args.id);
      return await NoteEntity.updater(existingNote)
        .setField('title', args.note.title)
        .setField('body', args.note.body)
        .updateAsync();
    },
    async deleteNote(_root, args, { viewerContext }) {
      const existingNote = await NoteEntity.loader(viewerContext).loadByIDAsync(args.id);
      await NoteEntity.deleter(existingNote).deleteAsync();
      return existingNote;
    },
  } as IObjectTypeResolver<any, GraphqlContext>,
};

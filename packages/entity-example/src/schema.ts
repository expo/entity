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
      return await NoteEntity.loader(viewerContext, viewerContext.getQueryContext())
        .enforcing()
        .loadByIDAsync(args.id);
    },
  } as IObjectTypeResolver<any, GraphqlContext>,

  User: {
    id: (root) => root,
    async notes(root, _args, { viewerContext }) {
      return await NoteEntity.loader(viewerContext, viewerContext.getQueryContext())
        .enforcing()
        .loadManyByFieldEqualingAsync('userID', root);
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

      return await NoteEntity.creator(viewerContext, viewerContext.getQueryContext())
        .setField('userID', viewerContext.userID)
        .setField('title', args.note.title)
        .setField('body', args.note.body)
        .enforceCreateAsync();
    },
    async updateNote(_root, args, { viewerContext }) {
      return await viewerContext.runInTransactionAsync(async (queryContext) => {
        const existingNote = await NoteEntity.loader(viewerContext, queryContext)
          .enforcing()
          .loadByIDAsync(args.id);
        return await NoteEntity.updater(existingNote, queryContext)
          .setField('title', args.note.title)
          .setField('body', args.note.body)
          .enforceUpdateAsync();
      });
    },
    async deleteNote(_root, args, { viewerContext }) {
      return await viewerContext.runInTransactionAsync(async (queryContext) => {
        const existingNote = await NoteEntity.loader(viewerContext, queryContext)
          .enforcing()
          .loadByIDAsync(args.id);
        await NoteEntity.enforceDeleteAsync(existingNote, queryContext);
        return existingNote;
      });
    },
  } as IObjectTypeResolver<any, GraphqlContext>,
};

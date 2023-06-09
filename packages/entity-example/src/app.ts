import { ApolloServer } from '@apollo/server';
import { koaMiddleware } from '@as-integrations/koa';
import { EntityCompanionProvider } from '@expo/entity';
import cors from '@koa/cors';
import Router from '@koa/router';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';

import { entityCompanionMiddleware, viewerContextMiddleware } from './middleware';
import notesRouter from './routers/notesRouter';
import { typeDefs, resolvers } from './schema';
import { ExampleViewerContext } from './viewerContexts';

export type ExampleContext = Koa.ParameterizedContext<ExampleState>;

/**
 * Koa provides a per-request state container to place custom properties.
 * For Entity, this contains the ViewerContext and optionally the companion
 * provider (to separate out the viewer context and companion provider middleware).
 */
export type ExampleState = {
  viewerContext: ExampleViewerContext; // viewerContextMiddleware
  entityCompanionProvider: EntityCompanionProvider; // entityCompanionMiddleware
};

export default async function createAppAsync(): Promise<Koa<ExampleState, ExampleContext>> {
  const app = new Koa<ExampleState, ExampleContext>();

  // initialze the entity framework for each request
  app.use(entityCompanionMiddleware);

  // generate a viewer context for each request
  app.use(viewerContextMiddleware);

  app.use(cors());

  // body parsing for POST/PUT requests
  app.use(bodyParser());

  // serve routes that make use of the viewer context
  const router = new Router<ExampleState, ExampleContext>();

  // normal API routes
  router.use(notesRouter.routes());

  // GraphQL routes
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });
  await server.start();
  router.post(
    '/graphql',
    koaMiddleware(server, {
      context: async ({ ctx }) => ({ viewerContext: (ctx as ExampleContext).state.viewerContext }),
    })
  );

  app.use(router.routes()).use(router.allowedMethods());

  return app;
}

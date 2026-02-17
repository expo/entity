import { ApolloServer, type BaseContext } from '@apollo/server';
import { koaMiddleware } from '@as-integrations/koa';
import { EntityCompanionProvider } from '@expo/entity';
import { bodyParser } from '@koa/bodyparser';
import cors from '@koa/cors';
import Router from '@koa/router';
import Koa from 'koa';

import { entityCompanionMiddleware, viewerContextMiddleware } from './middleware.ts';
import { notesRouter } from './routers/notesRouter.ts';
import { resolvers, typeDefs } from './schema.ts';
import { ExampleViewerContext } from './viewerContexts.ts';

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

export interface GraphQLContext extends BaseContext {
  viewerContext: ExampleViewerContext;
}

export async function createAppAsync(): Promise<Koa<ExampleState, ExampleContext>> {
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
  const server = new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers,
  });
  await server.start();
  router.post(
    '/graphql',
    // @ts-expect-error - @as-integrations/koa peers on @apollo/server ^4 (CJS types) but we use v5 (ESM types)
    koaMiddleware<GraphQLContext, ExampleState, ExampleContext>(server, {
      context: async ({ ctx }: { ctx: ExampleContext }) => ({
        viewerContext: ctx.state.viewerContext,
      }),
    }),
  );

  app.use(router.routes()).use(router.allowedMethods());

  return app;
}

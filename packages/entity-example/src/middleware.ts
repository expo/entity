import { NoOpEntityMetricsAdapter } from '@expo/entity';
import type { Next } from 'koa';

import type { ExampleContext } from './app.ts';
import { createEntityCompanionProvider } from './data.ts';
import { AnonymousViewerContext, UserViewerContext } from './viewerContexts.ts';

/**
 * The Koa middleware that instantiates the entity framework. A companion provider should
 * be instantiated for each request.
 */
export const entityCompanionMiddleware = async (ctx: ExampleContext, next: Next): Promise<void> => {
  const metricsAdapter = new NoOpEntityMetricsAdapter();
  const companionProvider = createEntityCompanionProvider(metricsAdapter);
  ctx.state.entityCompanionProvider = companionProvider;
  await next();
};

/**
 * The Koa middleware that generates an appropriate ViewerContext for the incoming request for use
 * in the endpoints. For demonstration purposes, a UserViewerContext is generated the request is
 * "authenticated". Otherwise, an AnonymousViewerContext is generated.
 */
export const viewerContextMiddleware = async (ctx: ExampleContext, next: Next): Promise<void> => {
  const userID = ctx.get('totally-secure-user-id');
  ctx.state.viewerContext = userID
    ? new UserViewerContext(ctx.state.entityCompanionProvider, userID)
    : new AnonymousViewerContext(ctx.state.entityCompanionProvider);
  await next();
};

import { EntityCompanionProvider } from '@expo/entity';
import Koa from 'koa';
import koaBody from 'koa-body';
import KoaRouter from 'koa-router';

import { entityCompanionMiddleware, viewerContextMiddleware } from './middleware';
import notesRouter from './routers/notesRouter';
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

const app = new Koa();

// body parsing for POST/PUT requests
app.use(koaBody());

// initialze the entity framework for each request
app.use(entityCompanionMiddleware);

// generate a viewer context for each request
app.use(viewerContextMiddleware);

// serve routes that make use of the viewer context
const router = new KoaRouter<ExampleState>();
router.use(notesRouter.routes());
app.use(router.routes()).use(router.allowedMethods());

export default app;

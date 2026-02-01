import { ViewerContext } from '@expo/entity';
import { CommentEntity } from './entities/CommentEntity';

// Chained calls
const loadComments = async (viewerContext: ViewerContext) => {
  // Direct chaining with knex-specific method
  const comments = await CommentEntity.loader(viewerContext)
    .loadManyByFieldEqualityConjunctionAsync([
      { fieldName: 'postId', fieldValue: '123' }
    ]);

  // Direct chaining with regular method - should NOT be transformed
  const singleComment = await CommentEntity
    .loader(viewerContext)
    .loadByIDAsync('456');

  // With authorization results and knex method
  const commentsWithAuth = await CommentEntity
    .loaderWithAuthorizationResults(viewerContext)
    .loadManyByRawWhereClauseAsync('postId = ?', ['456']);

  // Edge cases - these should NOT be transformed
  const anotherEntity = {
    loader: (ctx: any) => ctx, // This is not an entity class
  };
  anotherEntity.loader(viewerContext); // Should NOT be transformed (lowercase object)

  // Complex chaining with regular method - should NOT be transformed
  return CommentEntity
    .loader(viewerContext)
    .withAuthenticationResults()
    .loadByIDAsync('789');
};
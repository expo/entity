import { ViewerContext } from '@expo/entity';
import { UserEntity } from './entities/UserEntity';
import { PostEntity } from './entities/PostEntity';

async function loadUser(viewerContext: ViewerContext) {
  // Basic loader calls - only transformed when using knex-specific methods
  const userLoader = UserEntity.loader(viewerContext);
  const postLoader = PostEntity.knexLoader(viewerContext);

  // These use knex-specific methods, so they should be transformed
  const posts = await postLoader.loadManyByFieldEqualityConjunctionAsync([
    { fieldName: 'status', fieldValue: 'published' }
  ]);
  const firstPost = await postLoader.loadFirstByFieldEqualityConjunctionAsync([
    { fieldName: 'id', fieldValue: '123' }
  ]);

  // Loader with authorization results - only transformed when using knex methods
  const userLoaderWithAuth = UserEntity.knexLoaderWithAuthorizationResults(viewerContext);
  const rawResults = await userLoaderWithAuth.loadManyByRawWhereClauseAsync('age > ?', [18]);

  // Loader that doesn't use knex methods - should NOT be transformed
  const standardLoader = PostEntity.loader(viewerContext);
  const post = await standardLoader.loadByIDAsync('456');

  // Should not transform instance methods or other properties
  const user = await userLoader.loadByIDAsync('123');
  const userLoadMethod = user.loader; // This should not be transformed

  // Should not transform lowercase object methods
  const customLoader = {
    loader: (ctx: any) => ctx,
  };
  customLoader.loader(viewerContext);

  return user;
}
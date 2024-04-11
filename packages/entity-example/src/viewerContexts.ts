import {
  ViewerContext,
  EntityCompanionProvider,
  EntityQueryContext,
  EntityTransactionalQueryContext,
} from '@expo/entity';

/**
 * A base class for better typing Entities and Privacy Policies specific to this application.
 */
export abstract class ExampleViewerContext extends ViewerContext {
  isUserViewerContext(): this is UserViewerContext {
    return this instanceof UserViewerContext;
  }

  isAnonymousViewerContext(): this is AnonymousViewerContext {
    return this instanceof AnonymousViewerContext;
  }

  public getQueryContext(): EntityQueryContext {
    return super.getNonTransactionalQueryContextForDatabaseAdaptorFlavor('postgres');
  }

  public async runInTransactionAsync<TResult>(
    transactionScope: (queryContext: EntityTransactionalQueryContext) => Promise<TResult>
  ): Promise<TResult> {
    return await super.runInTransactionForDatabaseAdaptorFlavorAsync('postgres', transactionScope);
  }
}

/**
 * Represents a logged-in user.
 */
export class UserViewerContext extends ExampleViewerContext {
  constructor(entityCompanionProvider: EntityCompanionProvider, public userID: string) {
    super(entityCompanionProvider);
  }
}

/**
 * Represents a user that is not logged-in.
 */
export class AnonymousViewerContext extends ExampleViewerContext {}

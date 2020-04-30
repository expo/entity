/**
 * Entity framework representation of transactional and non-transactional database
 * query execution units.
 *
 * The behavior of {@link EntityMutator} and {@link EntityLoader}
 * differs when in a transactional context.
 */
export abstract class EntityQueryContext {
  constructor(private readonly queryInterface: any) {}

  abstract isInTransaction(): boolean;

  getQueryInterface(): any {
    return this.queryInterface;
  }
}

export class EntityTransactionalQueryContext extends EntityQueryContext {
  isInTransaction(): boolean {
    return true;
  }
}

export class EntityNonTransactionalQueryContext extends EntityQueryContext {
  isInTransaction(): boolean {
    return false;
  }
}

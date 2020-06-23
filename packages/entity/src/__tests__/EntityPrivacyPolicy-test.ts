import { mock, instance, spy, verify, anyOfClass } from 'ts-mockito';

import Entity from '../Entity';
import {
  EntityCompanionDefinition,
  DatabaseAdapterFlavor,
  CacheAdapterFlavor,
} from '../EntityCompanionProvider';
import EntityConfiguration from '../EntityConfiguration';
import { EntityNotAuthorizedError } from '../EntityErrors';
import { UUIDField } from '../EntityFields';
import EntityPrivacyPolicy, {
  EntityPrivacyPolicyEvaluator,
  EntityPrivacyPolicyEvaluationMode,
} from '../EntityPrivacyPolicy';
import { EntityQueryContext } from '../EntityQueryContext';
import ViewerContext from '../ViewerContext';
import AlwaysAllowPrivacyPolicyRule from '../rules/AlwaysAllowPrivacyPolicyRule';
import AlwaysDenyPrivacyPolicyRule from '../rules/AlwaysDenyPrivacyPolicyRule';
import AlwaysSkipPrivacyPolicyRule from '../rules/AlwaysSkipPrivacyPolicyRule';
import PrivacyPolicyRule, { RuleEvaluationResult } from '../rules/PrivacyPolicyRule';

type BlahFields = {
  id: string;
};

class BlahEntity extends Entity<BlahFields, string, ViewerContext> {
  static getCompanionDefinition(): EntityCompanionDefinition<
    BlahFields,
    string,
    ViewerContext,
    BlahEntity,
    any
  > {
    return blahEntityCompanionDefinition;
  }
}

class AlwaysDenyPolicy extends EntityPrivacyPolicy<BlahFields, string, ViewerContext, BlahEntity> {
  protected readonly createRules = [
    new AlwaysDenyPrivacyPolicyRule<BlahFields, string, ViewerContext, BlahEntity>(),
  ];
  protected readonly readRules = [
    new AlwaysDenyPrivacyPolicyRule<BlahFields, string, ViewerContext, BlahEntity>(),
  ];
  protected readonly updateRules = [
    new AlwaysDenyPrivacyPolicyRule<BlahFields, string, ViewerContext, BlahEntity>(),
  ];
  protected readonly deleteRules = [
    new AlwaysDenyPrivacyPolicyRule<BlahFields, string, ViewerContext, BlahEntity>(),
  ];
}

class DryRunAlwaysDenyPolicy extends AlwaysDenyPolicy {
  // public method for test spying
  public denyHandler(
    _error: EntityNotAuthorizedError<BlahFields, string, ViewerContext, BlahEntity>
  ): void {}

  protected getPrivacyPolicyEvaluator(): EntityPrivacyPolicyEvaluator<
    BlahFields,
    string,
    ViewerContext,
    BlahEntity
  > {
    return {
      mode: EntityPrivacyPolicyEvaluationMode.DRY_RUN,
      denyHandler: this.denyHandler,
    };
  }
}

class LoggingEnforceAlwaysDenyPolicy extends AlwaysDenyPolicy {
  // public method for test spying
  public denyHandler(
    _error: EntityNotAuthorizedError<BlahFields, string, ViewerContext, BlahEntity>
  ): void {}

  protected getPrivacyPolicyEvaluator(): EntityPrivacyPolicyEvaluator<
    BlahFields,
    string,
    ViewerContext,
    BlahEntity
  > {
    return {
      mode: EntityPrivacyPolicyEvaluationMode.ENFORCE_AND_LOG,
      denyHandler: this.denyHandler,
    };
  }
}

class AlwaysAllowPolicy extends EntityPrivacyPolicy<BlahFields, string, ViewerContext, BlahEntity> {
  protected readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<BlahFields, string, ViewerContext, BlahEntity>(),
  ];
  protected readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<BlahFields, string, ViewerContext, BlahEntity>(),
  ];
  protected readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<BlahFields, string, ViewerContext, BlahEntity>(),
  ];
  protected readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<BlahFields, string, ViewerContext, BlahEntity>(),
  ];
}

class DryRunAlwaysAllowPolicy extends AlwaysAllowPolicy {
  // public method for test spying
  public denyHandler(
    _error: EntityNotAuthorizedError<BlahFields, string, ViewerContext, BlahEntity>
  ): void {}

  protected getPrivacyPolicyEvaluator(): EntityPrivacyPolicyEvaluator<
    BlahFields,
    string,
    ViewerContext,
    BlahEntity
  > {
    return {
      mode: EntityPrivacyPolicyEvaluationMode.DRY_RUN,
      denyHandler: this.denyHandler,
    };
  }
}

class LoggingEnforceAlwaysAllowPolicy extends AlwaysAllowPolicy {
  // public method for test spying
  public denyHandler(
    _error: EntityNotAuthorizedError<BlahFields, string, ViewerContext, BlahEntity>
  ): void {}

  protected getPrivacyPolicyEvaluator(): EntityPrivacyPolicyEvaluator<
    BlahFields,
    string,
    ViewerContext,
    BlahEntity
  > {
    return {
      mode: EntityPrivacyPolicyEvaluationMode.ENFORCE_AND_LOG,
      denyHandler: this.denyHandler,
    };
  }
}

class SkipAllPolicy extends EntityPrivacyPolicy<BlahFields, string, ViewerContext, BlahEntity> {
  protected readonly createRules = [
    new AlwaysSkipPrivacyPolicyRule<BlahFields, string, ViewerContext, BlahEntity>(),
  ];
  protected readonly readRules = [
    new AlwaysSkipPrivacyPolicyRule<BlahFields, string, ViewerContext, BlahEntity>(),
  ];
  protected readonly updateRules = [
    new AlwaysSkipPrivacyPolicyRule<BlahFields, string, ViewerContext, BlahEntity>(),
  ];
  protected readonly deleteRules = [
    new AlwaysSkipPrivacyPolicyRule<BlahFields, string, ViewerContext, BlahEntity>(),
  ];
}

class AlwaysThrowPrivacyPolicyRule extends PrivacyPolicyRule<
  BlahFields,
  string,
  ViewerContext,
  BlahEntity
> {
  evaluateAsync(
    _viewerContext: ViewerContext,
    _queryContext: EntityQueryContext,
    _entity: BlahEntity
  ): Promise<RuleEvaluationResult> {
    throw new Error('WooHoo!');
  }
}

class ThrowAllPolicy extends EntityPrivacyPolicy<BlahFields, string, ViewerContext, BlahEntity> {
  protected readonly createRules = [new AlwaysThrowPrivacyPolicyRule()];
  protected readonly readRules = [new AlwaysThrowPrivacyPolicyRule()];
  protected readonly updateRules = [new AlwaysThrowPrivacyPolicyRule()];
  protected readonly deleteRules = [new AlwaysThrowPrivacyPolicyRule()];
}

class DryRunThrowAllPolicy extends ThrowAllPolicy {
  // public method for test spying
  public denyHandler(
    _error: EntityNotAuthorizedError<BlahFields, string, ViewerContext, BlahEntity>
  ): void {}

  protected getPrivacyPolicyEvaluator(): EntityPrivacyPolicyEvaluator<
    BlahFields,
    string,
    ViewerContext,
    BlahEntity
  > {
    return {
      mode: EntityPrivacyPolicyEvaluationMode.DRY_RUN,
      denyHandler: this.denyHandler,
    };
  }
}

class LoggingEnforceThrowAllPolicy extends ThrowAllPolicy {
  // public method for test spying
  public denyHandler(
    _error: EntityNotAuthorizedError<BlahFields, string, ViewerContext, BlahEntity>
  ): void {}

  protected getPrivacyPolicyEvaluator(): EntityPrivacyPolicyEvaluator<
    BlahFields,
    string,
    ViewerContext,
    BlahEntity
  > {
    return {
      mode: EntityPrivacyPolicyEvaluationMode.ENFORCE_AND_LOG,
      denyHandler: this.denyHandler,
    };
  }
}

class EmptyPolicy extends EntityPrivacyPolicy<BlahFields, string, ViewerContext, BlahEntity> {
  protected readonly createRules = [];
  protected readonly readRules = [];
  protected readonly updateRules = [];
  protected readonly deleteRules = [];
}

const blahEntityCompanionDefinition = new EntityCompanionDefinition({
  entityClass: BlahEntity,
  entityConfiguration: new EntityConfiguration<BlahFields>({
    idField: 'id',
    tableName: 'blah_table',
    schema: {
      id: new UUIDField({
        columnName: 'id',
      }),
    },
  }),
  databaseAdaptorFlavor: DatabaseAdapterFlavor.POSTGRES,
  cacheAdaptorFlavor: CacheAdapterFlavor.REDIS,
  privacyPolicyClass: AlwaysDenyPolicy,
});

describe(EntityPrivacyPolicy, () => {
  it('throws EntityNotAuthorizedError when deny', async () => {
    const viewerContext = instance(mock(ViewerContext));
    const queryContext = instance(mock(EntityQueryContext));
    const entity = new BlahEntity(viewerContext, { id: '1' });
    const policy = new AlwaysDenyPolicy();
    await expect(
      policy.authorizeCreateAsync(viewerContext, queryContext, entity)
    ).rejects.toBeInstanceOf(EntityNotAuthorizedError);
  });

  it('returns entity when allowed', async () => {
    const viewerContext = instance(mock(ViewerContext));
    const queryContext = instance(mock(EntityQueryContext));
    const entity = new BlahEntity(viewerContext, { id: '1' });
    const policy = new AlwaysAllowPolicy();
    const approvedEntity = await policy.authorizeCreateAsync(viewerContext, queryContext, entity);
    expect(approvedEntity).toEqual(entity);
  });

  it('throws EntityNotAuthorizedError when all skipped', async () => {
    const viewerContext = instance(mock(ViewerContext));
    const queryContext = instance(mock(EntityQueryContext));
    const entity = new BlahEntity(viewerContext, { id: '1' });
    const policy = new SkipAllPolicy();
    await expect(
      policy.authorizeCreateAsync(viewerContext, queryContext, entity)
    ).rejects.toBeInstanceOf(EntityNotAuthorizedError);
  });

  it('throws EntityNotAuthorizedError when empty policy', async () => {
    const viewerContext = instance(mock(ViewerContext));
    const queryContext = instance(mock(EntityQueryContext));
    const entity = new BlahEntity(viewerContext, { id: '1' });
    const policy = new EmptyPolicy();
    await expect(
      policy.authorizeCreateAsync(viewerContext, queryContext, entity)
    ).rejects.toBeInstanceOf(EntityNotAuthorizedError);
  });

  it('throws when rule throws', async () => {
    const viewerContext = instance(mock(ViewerContext));
    const queryContext = instance(mock(EntityQueryContext));
    const entity = new BlahEntity(viewerContext, { id: '1' });
    const policy = new ThrowAllPolicy();
    await expect(
      policy.authorizeCreateAsync(viewerContext, queryContext, entity)
    ).rejects.toThrowError('WooHoo!');
  });

  describe('dry run', () => {
    it('returns entity when denied but calls denialHandler', async () => {
      const viewerContext = instance(mock(ViewerContext));
      const queryContext = instance(mock(EntityQueryContext));
      const entity = new BlahEntity(viewerContext, { id: '1' });
      const policy = new DryRunAlwaysDenyPolicy();

      const policySpy = spy(policy);

      const approvedEntity = await policy.authorizeCreateAsync(viewerContext, queryContext, entity);
      expect(approvedEntity).toEqual(entity);

      verify(policySpy.denyHandler(anyOfClass(EntityNotAuthorizedError))).once();
    });

    it('does not log when not denied', async () => {
      const viewerContext = instance(mock(ViewerContext));
      const queryContext = instance(mock(EntityQueryContext));
      const entity = new BlahEntity(viewerContext, { id: '1' });
      const policy = new DryRunAlwaysAllowPolicy();

      const policySpy = spy(policy);

      const approvedEntity = await policy.authorizeCreateAsync(viewerContext, queryContext, entity);
      expect(approvedEntity).toEqual(entity);

      verify(policySpy.denyHandler(anyOfClass(EntityNotAuthorizedError))).never();
    });

    it('passes through other errors', async () => {
      const viewerContext = instance(mock(ViewerContext));
      const queryContext = instance(mock(EntityQueryContext));
      const entity = new BlahEntity(viewerContext, { id: '1' });
      const policy = new DryRunThrowAllPolicy();

      const policySpy = spy(policy);

      await expect(
        policy.authorizeCreateAsync(viewerContext, queryContext, entity)
      ).rejects.toThrowError('WooHoo!');

      verify(policySpy.denyHandler(anyOfClass(EntityNotAuthorizedError))).never();
    });
  });

  describe('logging enforce', () => {
    it('denies when denied but calls denialHandler', async () => {
      const viewerContext = instance(mock(ViewerContext));
      const queryContext = instance(mock(EntityQueryContext));
      const entity = new BlahEntity(viewerContext, { id: '1' });
      const policy = new LoggingEnforceAlwaysDenyPolicy();

      const policySpy = spy(policy);

      await expect(
        policy.authorizeCreateAsync(viewerContext, queryContext, entity)
      ).rejects.toBeInstanceOf(EntityNotAuthorizedError);

      verify(policySpy.denyHandler(anyOfClass(EntityNotAuthorizedError))).once();
    });

    it('does not log when not denied', async () => {
      const viewerContext = instance(mock(ViewerContext));
      const queryContext = instance(mock(EntityQueryContext));
      const entity = new BlahEntity(viewerContext, { id: '1' });
      const policy = new LoggingEnforceAlwaysAllowPolicy();

      const policySpy = spy(policy);

      const approvedEntity = await policy.authorizeCreateAsync(viewerContext, queryContext, entity);
      expect(approvedEntity).toEqual(entity);

      verify(policySpy.denyHandler(anyOfClass(EntityNotAuthorizedError))).never();
    });

    it('passes through other errors', async () => {
      const viewerContext = instance(mock(ViewerContext));
      const queryContext = instance(mock(EntityQueryContext));
      const entity = new BlahEntity(viewerContext, { id: '1' });
      const policy = new LoggingEnforceThrowAllPolicy();

      const policySpy = spy(policy);

      await expect(
        policy.authorizeCreateAsync(viewerContext, queryContext, entity)
      ).rejects.toThrowError('WooHoo!');

      verify(policySpy.denyHandler(anyOfClass(EntityNotAuthorizedError))).never();
    });
  });
});

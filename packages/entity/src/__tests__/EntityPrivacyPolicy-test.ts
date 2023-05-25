import { mock, instance, spy, verify, anyOfClass, anything, objectContaining } from 'ts-mockito';

import Entity from '../Entity';
import { EntityCompanionDefinition } from '../EntityCompanionProvider';
import EntityConfiguration from '../EntityConfiguration';
import { UUIDField } from '../EntityFields';
import EntityPrivacyPolicy, {
  EntityPrivacyPolicyEvaluator,
  EntityAuthorizationAction,
  EntityPrivacyPolicyEvaluationMode,
  EntityPrivacyPolicyEvaluationContext,
} from '../EntityPrivacyPolicy';
import { EntityQueryContext } from '../EntityQueryContext';
import ViewerContext from '../ViewerContext';
import EntityNotAuthorizedError from '../errors/EntityNotAuthorizedError';
import IEntityMetricsAdapter, {
  EntityMetricsAuthorizationResult,
} from '../metrics/IEntityMetricsAdapter';
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
  protected override readonly createRules = [
    new AlwaysDenyPrivacyPolicyRule<BlahFields, string, ViewerContext, BlahEntity>(),
  ];
  protected override readonly readRules = [
    new AlwaysDenyPrivacyPolicyRule<BlahFields, string, ViewerContext, BlahEntity>(),
  ];
  protected override readonly updateRules = [
    new AlwaysDenyPrivacyPolicyRule<BlahFields, string, ViewerContext, BlahEntity>(),
  ];
  protected override readonly deleteRules = [
    new AlwaysDenyPrivacyPolicyRule<BlahFields, string, ViewerContext, BlahEntity>(),
  ];
}

class DryRunAlwaysDenyPolicy extends AlwaysDenyPolicy {
  // public method for test spying
  public denyHandler(
    _error: EntityNotAuthorizedError<BlahFields, string, ViewerContext, BlahEntity>
  ): void {}

  protected override getPrivacyPolicyEvaluator(): EntityPrivacyPolicyEvaluator<
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

  protected override getPrivacyPolicyEvaluator(): EntityPrivacyPolicyEvaluator<
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
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<BlahFields, string, ViewerContext, BlahEntity>(),
  ];
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<BlahFields, string, ViewerContext, BlahEntity>(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<BlahFields, string, ViewerContext, BlahEntity>(),
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<BlahFields, string, ViewerContext, BlahEntity>(),
  ];
}

class DryRunAlwaysAllowPolicy extends AlwaysAllowPolicy {
  // public method for test spying
  public denyHandler(
    _error: EntityNotAuthorizedError<BlahFields, string, ViewerContext, BlahEntity>
  ): void {}

  protected override getPrivacyPolicyEvaluator(): EntityPrivacyPolicyEvaluator<
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

  protected override getPrivacyPolicyEvaluator(): EntityPrivacyPolicyEvaluator<
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
  protected override readonly createRules = [
    new AlwaysSkipPrivacyPolicyRule<BlahFields, string, ViewerContext, BlahEntity>(),
  ];
  protected override readonly readRules = [
    new AlwaysSkipPrivacyPolicyRule<BlahFields, string, ViewerContext, BlahEntity>(),
  ];
  protected override readonly updateRules = [
    new AlwaysSkipPrivacyPolicyRule<BlahFields, string, ViewerContext, BlahEntity>(),
  ];
  protected override readonly deleteRules = [
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
    _evaluationContext: EntityPrivacyPolicyEvaluationContext,
    _entity: BlahEntity
  ): Promise<RuleEvaluationResult> {
    throw new Error('WooHoo!');
  }
}

class ThrowAllPolicy extends EntityPrivacyPolicy<BlahFields, string, ViewerContext, BlahEntity> {
  protected override readonly createRules = [new AlwaysThrowPrivacyPolicyRule()];
  protected override readonly readRules = [new AlwaysThrowPrivacyPolicyRule()];
  protected override readonly updateRules = [new AlwaysThrowPrivacyPolicyRule()];
  protected override readonly deleteRules = [new AlwaysThrowPrivacyPolicyRule()];
}

class DryRunThrowAllPolicy extends ThrowAllPolicy {
  // public method for test spying
  public denyHandler(
    _error: EntityNotAuthorizedError<BlahFields, string, ViewerContext, BlahEntity>
  ): void {}

  protected override getPrivacyPolicyEvaluator(): EntityPrivacyPolicyEvaluator<
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

  protected override getPrivacyPolicyEvaluator(): EntityPrivacyPolicyEvaluator<
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
  protected override readonly createRules = [];
  protected override readonly readRules = [];
  protected override readonly updateRules = [];
  protected override readonly deleteRules = [];
}

const blahConfiguration = new EntityConfiguration<BlahFields>({
  idField: 'id',
  tableName: 'blah_table',
  schema: {
    id: new UUIDField({
      columnName: 'id',
    }),
  },
  databaseAdapterFlavor: 'postgres',
  cacheAdapterFlavor: 'redis',
});

const blahEntityCompanionDefinition = new EntityCompanionDefinition({
  entityClass: BlahEntity,
  entityConfiguration: blahConfiguration,
  privacyPolicyClass: AlwaysDenyPolicy,
});

describe(EntityPrivacyPolicy, () => {
  describe(EntityPrivacyPolicyEvaluationMode.ENFORCE.toString(), () => {
    it('throws EntityNotAuthorizedError when deny', async () => {
      const viewerContext = instance(mock(ViewerContext));
      const queryContext = instance(mock(EntityQueryContext));
      const privacyPolicyEvaluationContext = instance(mock<EntityPrivacyPolicyEvaluationContext>());
      const metricsAdapterMock = mock<IEntityMetricsAdapter>();
      const metricsAdapter = instance(metricsAdapterMock);
      const entity = new BlahEntity(viewerContext, { id: '1' });
      const policy = new AlwaysDenyPolicy();
      await expect(
        policy.authorizeCreateAsync(
          viewerContext,
          queryContext,
          privacyPolicyEvaluationContext,
          entity,
          metricsAdapter
        )
      ).rejects.toBeInstanceOf(EntityNotAuthorizedError);
      verify(
        metricsAdapterMock.logAuthorizationEvent(
          objectContaining({
            entityClassName: entity.constructor.name,
            action: EntityAuthorizationAction.CREATE,
            evaluationResult: EntityMetricsAuthorizationResult.DENY,
            privacyPolicyEvaluationMode: EntityPrivacyPolicyEvaluationMode.ENFORCE,
          })
        )
      ).once();
    });

    it('returns entity when allowed', async () => {
      const viewerContext = instance(mock(ViewerContext));
      const queryContext = instance(mock(EntityQueryContext));
      const privacyPolicyEvaluationContext = instance(mock<EntityPrivacyPolicyEvaluationContext>());
      const metricsAdapterMock = mock<IEntityMetricsAdapter>();
      const metricsAdapter = instance(metricsAdapterMock);
      const entity = new BlahEntity(viewerContext, { id: '1' });
      const policy = new AlwaysAllowPolicy();
      const approvedEntity = await policy.authorizeCreateAsync(
        viewerContext,
        queryContext,
        privacyPolicyEvaluationContext,
        entity,
        metricsAdapter
      );
      expect(approvedEntity).toEqual(entity);
      verify(
        metricsAdapterMock.logAuthorizationEvent(
          objectContaining({
            entityClassName: entity.constructor.name,
            action: EntityAuthorizationAction.CREATE,
            evaluationResult: EntityMetricsAuthorizationResult.ALLOW,
            privacyPolicyEvaluationMode: EntityPrivacyPolicyEvaluationMode.ENFORCE,
          })
        )
      ).once();
    });

    it('throws EntityNotAuthorizedError when all skipped', async () => {
      const viewerContext = instance(mock(ViewerContext));
      const queryContext = instance(mock(EntityQueryContext));
      const privacyPolicyEvaluationContext = instance(mock<EntityPrivacyPolicyEvaluationContext>());
      const metricsAdapterMock = mock<IEntityMetricsAdapter>();
      const metricsAdapter = instance(metricsAdapterMock);
      const entity = new BlahEntity(viewerContext, { id: '1' });
      const policy = new SkipAllPolicy();
      await expect(
        policy.authorizeCreateAsync(
          viewerContext,
          queryContext,
          privacyPolicyEvaluationContext,
          entity,
          metricsAdapter
        )
      ).rejects.toBeInstanceOf(EntityNotAuthorizedError);
      verify(
        metricsAdapterMock.logAuthorizationEvent(
          objectContaining({
            entityClassName: entity.constructor.name,
            action: EntityAuthorizationAction.CREATE,
            evaluationResult: EntityMetricsAuthorizationResult.DENY,
            privacyPolicyEvaluationMode: EntityPrivacyPolicyEvaluationMode.ENFORCE,
          })
        )
      ).once();
    });

    it('throws EntityNotAuthorizedError when empty policy', async () => {
      const viewerContext = instance(mock(ViewerContext));
      const queryContext = instance(mock(EntityQueryContext));
      const privacyPolicyEvaluationContext = instance(mock<EntityPrivacyPolicyEvaluationContext>());
      const metricsAdapterMock = mock<IEntityMetricsAdapter>();
      const metricsAdapter = instance(metricsAdapterMock);
      const entity = new BlahEntity(viewerContext, { id: '1' });
      const policy = new EmptyPolicy();
      await expect(
        policy.authorizeCreateAsync(
          viewerContext,
          queryContext,
          privacyPolicyEvaluationContext,
          entity,
          metricsAdapter
        )
      ).rejects.toBeInstanceOf(EntityNotAuthorizedError);
      verify(
        metricsAdapterMock.logAuthorizationEvent(
          objectContaining({
            entityClassName: entity.constructor.name,
            action: EntityAuthorizationAction.CREATE,
            evaluationResult: EntityMetricsAuthorizationResult.DENY,
            privacyPolicyEvaluationMode: EntityPrivacyPolicyEvaluationMode.ENFORCE,
          })
        )
      ).once();
    });

    it('throws when rule throws', async () => {
      const viewerContext = instance(mock(ViewerContext));
      const queryContext = instance(mock(EntityQueryContext));
      const privacyPolicyEvaluationContext = instance(mock<EntityPrivacyPolicyEvaluationContext>());
      const metricsAdapterMock = mock<IEntityMetricsAdapter>();
      const metricsAdapter = instance(metricsAdapterMock);
      const entity = new BlahEntity(viewerContext, { id: '1' });
      const policy = new ThrowAllPolicy();
      await expect(
        policy.authorizeCreateAsync(
          viewerContext,
          queryContext,
          privacyPolicyEvaluationContext,
          entity,
          metricsAdapter
        )
      ).rejects.toThrowError('WooHoo!');
      verify(metricsAdapterMock.logAuthorizationEvent(anything())).never();
    });
  });

  describe(EntityPrivacyPolicyEvaluationMode.DRY_RUN.toString(), () => {
    it('returns entity when denied but calls denialHandler', async () => {
      const viewerContext = instance(mock(ViewerContext));
      const queryContext = instance(mock(EntityQueryContext));
      const privacyPolicyEvaluationContext = instance(mock<EntityPrivacyPolicyEvaluationContext>());
      const metricsAdapterMock = mock<IEntityMetricsAdapter>();
      const metricsAdapter = instance(metricsAdapterMock);
      const entity = new BlahEntity(viewerContext, { id: '1' });
      const policy = new DryRunAlwaysDenyPolicy();

      const policySpy = spy(policy);

      const approvedEntity = await policy.authorizeCreateAsync(
        viewerContext,
        queryContext,
        privacyPolicyEvaluationContext,
        entity,
        metricsAdapter
      );
      expect(approvedEntity).toEqual(entity);

      verify(policySpy.denyHandler(anyOfClass(EntityNotAuthorizedError))).once();

      verify(
        metricsAdapterMock.logAuthorizationEvent(
          objectContaining({
            entityClassName: entity.constructor.name,
            action: EntityAuthorizationAction.CREATE,
            evaluationResult: EntityMetricsAuthorizationResult.DENY,
            privacyPolicyEvaluationMode: EntityPrivacyPolicyEvaluationMode.DRY_RUN,
          })
        )
      ).once();
    });

    it('does not log when not denied', async () => {
      const viewerContext = instance(mock(ViewerContext));
      const queryContext = instance(mock(EntityQueryContext));
      const privacyPolicyEvaluationContext = instance(mock<EntityPrivacyPolicyEvaluationContext>());
      const metricsAdapterMock = mock<IEntityMetricsAdapter>();
      const metricsAdapter = instance(metricsAdapterMock);
      const entity = new BlahEntity(viewerContext, { id: '1' });
      const policy = new DryRunAlwaysAllowPolicy();

      const policySpy = spy(policy);

      const approvedEntity = await policy.authorizeCreateAsync(
        viewerContext,
        queryContext,
        privacyPolicyEvaluationContext,
        entity,
        metricsAdapter
      );
      expect(approvedEntity).toEqual(entity);

      verify(policySpy.denyHandler(anyOfClass(EntityNotAuthorizedError))).never();

      verify(
        metricsAdapterMock.logAuthorizationEvent(
          objectContaining({
            entityClassName: entity.constructor.name,
            action: EntityAuthorizationAction.CREATE,
            evaluationResult: EntityMetricsAuthorizationResult.ALLOW,
            privacyPolicyEvaluationMode: EntityPrivacyPolicyEvaluationMode.DRY_RUN,
          })
        )
      ).once();
    });

    it('passes through other errors', async () => {
      const viewerContext = instance(mock(ViewerContext));
      const queryContext = instance(mock(EntityQueryContext));
      const privacyPolicyEvaluationContext = instance(mock<EntityPrivacyPolicyEvaluationContext>());
      const metricsAdapterMock = mock<IEntityMetricsAdapter>();
      const metricsAdapter = instance(metricsAdapterMock);
      const entity = new BlahEntity(viewerContext, { id: '1' });
      const policy = new DryRunThrowAllPolicy();

      const policySpy = spy(policy);

      await expect(
        policy.authorizeCreateAsync(
          viewerContext,
          queryContext,
          privacyPolicyEvaluationContext,
          entity,
          metricsAdapter
        )
      ).rejects.toThrowError('WooHoo!');

      verify(policySpy.denyHandler(anyOfClass(EntityNotAuthorizedError))).never();

      verify(metricsAdapterMock.logAuthorizationEvent(anything())).never();
    });
  });

  describe(EntityPrivacyPolicyEvaluationMode.ENFORCE_AND_LOG.toString(), () => {
    it('denies when denied but calls denialHandler', async () => {
      const viewerContext = instance(mock(ViewerContext));
      const queryContext = instance(mock(EntityQueryContext));
      const privacyPolicyEvaluationContext = instance(mock<EntityPrivacyPolicyEvaluationContext>());
      const metricsAdapterMock = mock<IEntityMetricsAdapter>();
      const metricsAdapter = instance(metricsAdapterMock);
      const entity = new BlahEntity(viewerContext, { id: '1' });
      const policy = new LoggingEnforceAlwaysDenyPolicy();

      const policySpy = spy(policy);

      await expect(
        policy.authorizeCreateAsync(
          viewerContext,
          queryContext,
          privacyPolicyEvaluationContext,
          entity,
          metricsAdapter
        )
      ).rejects.toBeInstanceOf(EntityNotAuthorizedError);

      verify(policySpy.denyHandler(anyOfClass(EntityNotAuthorizedError))).once();

      verify(
        metricsAdapterMock.logAuthorizationEvent(
          objectContaining({
            entityClassName: entity.constructor.name,
            action: EntityAuthorizationAction.CREATE,
            evaluationResult: EntityMetricsAuthorizationResult.DENY,
            privacyPolicyEvaluationMode: EntityPrivacyPolicyEvaluationMode.ENFORCE_AND_LOG,
          })
        )
      ).once();
    });

    it('does not log when not denied', async () => {
      const viewerContext = instance(mock(ViewerContext));
      const queryContext = instance(mock(EntityQueryContext));
      const privacyPolicyEvaluationContext = instance(mock<EntityPrivacyPolicyEvaluationContext>());
      const metricsAdapterMock = mock<IEntityMetricsAdapter>();
      const metricsAdapter = instance(metricsAdapterMock);
      const entity = new BlahEntity(viewerContext, { id: '1' });
      const policy = new LoggingEnforceAlwaysAllowPolicy();

      const policySpy = spy(policy);

      const approvedEntity = await policy.authorizeCreateAsync(
        viewerContext,
        queryContext,
        privacyPolicyEvaluationContext,
        entity,
        metricsAdapter
      );
      expect(approvedEntity).toEqual(entity);

      verify(policySpy.denyHandler(anyOfClass(EntityNotAuthorizedError))).never();

      verify(
        metricsAdapterMock.logAuthorizationEvent(
          objectContaining({
            entityClassName: entity.constructor.name,
            action: EntityAuthorizationAction.CREATE,
            evaluationResult: EntityMetricsAuthorizationResult.ALLOW,
            privacyPolicyEvaluationMode: EntityPrivacyPolicyEvaluationMode.ENFORCE_AND_LOG,
          })
        )
      ).once();
    });

    it('passes through other errors', async () => {
      const viewerContext = instance(mock(ViewerContext));
      const queryContext = instance(mock(EntityQueryContext));
      const privacyPolicyEvaluationContext = instance(mock<EntityPrivacyPolicyEvaluationContext>());
      const metricsAdapterMock = mock<IEntityMetricsAdapter>();
      const metricsAdapter = instance(metricsAdapterMock);
      const entity = new BlahEntity(viewerContext, { id: '1' });
      const policy = new LoggingEnforceThrowAllPolicy();

      const policySpy = spy(policy);

      await expect(
        policy.authorizeCreateAsync(
          viewerContext,
          queryContext,
          privacyPolicyEvaluationContext,
          entity,
          metricsAdapter
        )
      ).rejects.toThrowError('WooHoo!');

      verify(policySpy.denyHandler(anyOfClass(EntityNotAuthorizedError))).never();

      verify(metricsAdapterMock.logAuthorizationEvent(anything())).never();
    });
  });
});

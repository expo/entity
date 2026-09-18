import { describe, expect, it } from '@jest/globals';
import { anyOfClass, anything, instance, mock, objectContaining, spy, verify } from 'ts-mockito';

import { Entity } from '../Entity.ts';
import type { EntityCompanionDefinition } from '../EntityCompanionProvider.ts';
import { EntityConfiguration } from '../EntityConfiguration.ts';
import { UUIDField } from '../EntityFields.ts';
import type {
  EntityPrivacyPolicyEvaluationContext,
  EntityPrivacyPolicyEvaluator,
  EntityPrivacyPolicyRuleEvaluationContext,
} from '../EntityPrivacyPolicy.ts';
import {
  EntityAuthorizationAction,
  EntityPrivacyPolicy,
  EntityPrivacyPolicyEvaluationMode,
} from '../EntityPrivacyPolicy.ts';
import { EntityQueryContext } from '../EntityQueryContext.ts';
import { ViewerContext } from '../ViewerContext.ts';
import type {
  EntityNotAuthorizedDenialReason,
  EntityNotAuthorizedUserFacingReason,
} from '../errors/EntityNotAuthorizedError.ts';
import {
  EntityNotAuthorizedDenialType,
  EntityNotAuthorizedError,
} from '../errors/EntityNotAuthorizedError.ts';
import type { IEntityMetricsAdapter } from '../metrics/IEntityMetricsAdapter.ts';
import { EntityMetricsAuthorizationResult } from '../metrics/IEntityMetricsAdapter.ts';
import { AllowIfAllSubRulesAllowPrivacyPolicyRule } from '../rules/AllowIfAllSubRulesAllowPrivacyPolicyRule.ts';
import { AllowIfAnySubRuleAllowsPrivacyPolicyRule } from '../rules/AllowIfAnySubRuleAllowsPrivacyPolicyRule.ts';
import { AlwaysAllowPrivacyPolicyRule } from '../rules/AlwaysAllowPrivacyPolicyRule.ts';
import { AlwaysDenyPrivacyPolicyRule } from '../rules/AlwaysDenyPrivacyPolicyRule.ts';
import { AlwaysSkipPrivacyPolicyRule } from '../rules/AlwaysSkipPrivacyPolicyRule.ts';
import { EvaluateIfEntityFieldPredicatePrivacyPolicyRule } from '../rules/EvaluateIfEntityFieldPredicatePrivacyPolicyRule.ts';
import type { RuleEvaluationOutcome } from '../rules/PrivacyPolicyRule.ts';
import {
  PrivacyPolicyRule,
  RuleEvaluationResult,
  denyWithReasons,
  skipWithReasons,
} from '../rules/PrivacyPolicyRule.ts';

type BlahFields = {
  id: string;
};

class BlahEntity extends Entity<BlahFields, 'id', ViewerContext> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    BlahFields,
    'id',
    ViewerContext,
    BlahEntity,
    any
  > {
    return {
      entityClass: BlahEntity,
      entityConfiguration: new EntityConfiguration<BlahFields, 'id'>({
        idField: 'id',
        tableName: 'blah_table',
        schema: {
          id: new UUIDField({
            columnName: 'id',
            cache: false,
          }),
        },
        databaseAdapterFlavor: 'postgres',
        cacheAdapterFlavor: 'redis',
      }),
      privacyPolicyClass: AlwaysDenyPolicy,
    };
  }
}

class AlwaysDenyPolicy extends EntityPrivacyPolicy<BlahFields, 'id', ViewerContext, BlahEntity> {
  protected override readonly createRules = [
    new AlwaysDenyPrivacyPolicyRule<BlahFields, 'id', ViewerContext, BlahEntity>(),
  ];
  protected override readonly readRules = [
    new AlwaysDenyPrivacyPolicyRule<BlahFields, 'id', ViewerContext, BlahEntity>(),
  ];
  protected override readonly updateRules = [
    new AlwaysDenyPrivacyPolicyRule<BlahFields, 'id', ViewerContext, BlahEntity>(),
  ];
  protected override readonly deleteRules = [
    new AlwaysDenyPrivacyPolicyRule<BlahFields, 'id', ViewerContext, BlahEntity>(),
  ];
}

class DryRunAlwaysDenyPolicy extends AlwaysDenyPolicy {
  // public method for test spying
  public denyHandler(
    _error: EntityNotAuthorizedError<BlahFields, 'id', ViewerContext, BlahEntity>,
  ): void {}

  protected override getPrivacyPolicyEvaluator(): EntityPrivacyPolicyEvaluator<
    BlahFields,
    'id',
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
    _error: EntityNotAuthorizedError<BlahFields, 'id', ViewerContext, BlahEntity>,
  ): void {}

  protected override getPrivacyPolicyEvaluator(): EntityPrivacyPolicyEvaluator<
    BlahFields,
    'id',
    ViewerContext,
    BlahEntity
  > {
    return {
      mode: EntityPrivacyPolicyEvaluationMode.ENFORCE_AND_LOG,
      denyHandler: this.denyHandler,
    };
  }
}

class AlwaysAllowPolicy extends EntityPrivacyPolicy<BlahFields, 'id', ViewerContext, BlahEntity> {
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<BlahFields, 'id', ViewerContext, BlahEntity>(),
  ];
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<BlahFields, 'id', ViewerContext, BlahEntity>(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<BlahFields, 'id', ViewerContext, BlahEntity>(),
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<BlahFields, 'id', ViewerContext, BlahEntity>(),
  ];
}

class DryRunAlwaysAllowPolicy extends AlwaysAllowPolicy {
  // public method for test spying
  public denyHandler(
    _error: EntityNotAuthorizedError<BlahFields, 'id', ViewerContext, BlahEntity>,
  ): void {}

  protected override getPrivacyPolicyEvaluator(): EntityPrivacyPolicyEvaluator<
    BlahFields,
    'id',
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
    _error: EntityNotAuthorizedError<BlahFields, 'id', ViewerContext, BlahEntity>,
  ): void {}

  protected override getPrivacyPolicyEvaluator(): EntityPrivacyPolicyEvaluator<
    BlahFields,
    'id',
    ViewerContext,
    BlahEntity
  > {
    return {
      mode: EntityPrivacyPolicyEvaluationMode.ENFORCE_AND_LOG,
      denyHandler: this.denyHandler,
    };
  }
}

class SkipAllPolicy extends EntityPrivacyPolicy<BlahFields, 'id', ViewerContext, BlahEntity> {
  protected override readonly createRules = [
    new AlwaysSkipPrivacyPolicyRule<BlahFields, 'id', ViewerContext, BlahEntity>(),
  ];
  protected override readonly readRules = [
    new AlwaysSkipPrivacyPolicyRule<BlahFields, 'id', ViewerContext, BlahEntity>(),
  ];
  protected override readonly updateRules = [
    new AlwaysSkipPrivacyPolicyRule<BlahFields, 'id', ViewerContext, BlahEntity>(),
  ];
  protected override readonly deleteRules = [
    new AlwaysSkipPrivacyPolicyRule<BlahFields, 'id', ViewerContext, BlahEntity>(),
  ];
}

class InvalidCreateRuleResultPolicy extends EntityPrivacyPolicy<
  BlahFields,
  'id',
  ViewerContext,
  BlahEntity
> {
  protected override readonly createRules = [
    {
      async evaluateAsync(): Promise<RuleEvaluationResult> {
        return 2 as any;
      },
    },
  ];
  protected override readonly readRules = [
    new AlwaysSkipPrivacyPolicyRule<BlahFields, 'id', ViewerContext, BlahEntity>(),
  ];
  protected override readonly updateRules = [
    new AlwaysSkipPrivacyPolicyRule<BlahFields, 'id', ViewerContext, BlahEntity>(),
  ];
  protected override readonly deleteRules = [
    new AlwaysSkipPrivacyPolicyRule<BlahFields, 'id', ViewerContext, BlahEntity>(),
  ];
}

class AlwaysThrowPrivacyPolicyRule extends PrivacyPolicyRule<
  BlahFields,
  'id',
  ViewerContext,
  BlahEntity
> {
  evaluateAsync(
    _viewerContext: ViewerContext,
    _queryContext: EntityQueryContext,
    _evaluationContext: EntityPrivacyPolicyEvaluationContext<
      BlahFields,
      'id',
      ViewerContext,
      BlahEntity
    >,
    _entity: BlahEntity,
  ): Promise<RuleEvaluationResult> {
    throw new Error('WooHoo!');
  }
}

class ThrowAllPolicy extends EntityPrivacyPolicy<BlahFields, 'id', ViewerContext, BlahEntity> {
  protected override readonly createRules = [new AlwaysThrowPrivacyPolicyRule()];
  protected override readonly readRules = [new AlwaysThrowPrivacyPolicyRule()];
  protected override readonly updateRules = [new AlwaysThrowPrivacyPolicyRule()];
  protected override readonly deleteRules = [new AlwaysThrowPrivacyPolicyRule()];
}

class DryRunThrowAllPolicy extends ThrowAllPolicy {
  // public method for test spying
  public denyHandler(
    _error: EntityNotAuthorizedError<BlahFields, 'id', ViewerContext, BlahEntity>,
  ): void {}

  protected override getPrivacyPolicyEvaluator(): EntityPrivacyPolicyEvaluator<
    BlahFields,
    'id',
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
    _error: EntityNotAuthorizedError<BlahFields, 'id', ViewerContext, BlahEntity>,
  ): void {}

  protected override getPrivacyPolicyEvaluator(): EntityPrivacyPolicyEvaluator<
    BlahFields,
    'id',
    ViewerContext,
    BlahEntity
  > {
    return {
      mode: EntityPrivacyPolicyEvaluationMode.ENFORCE_AND_LOG,
      denyHandler: this.denyHandler,
    };
  }
}

class EmptyPolicy extends EntityPrivacyPolicy<BlahFields, 'id', ViewerContext, BlahEntity> {
  protected override readonly createRules = [];
  protected override readonly readRules = [];
  protected override readonly updateRules = [];
  protected override readonly deleteRules = [];
}

class ContextCapturingRule extends PrivacyPolicyRule<BlahFields, 'id', ViewerContext, BlahEntity> {
  public capturedContext: EntityPrivacyPolicyRuleEvaluationContext<
    BlahFields,
    'id',
    ViewerContext,
    BlahEntity
  > | null = null;

  async evaluateAsync(
    _viewerContext: ViewerContext,
    _queryContext: EntityQueryContext,
    evaluationContext: EntityPrivacyPolicyRuleEvaluationContext<
      BlahFields,
      'id',
      ViewerContext,
      BlahEntity
    >,
    _entity: BlahEntity,
  ): Promise<RuleEvaluationResult> {
    this.capturedContext = evaluationContext;
    return RuleEvaluationResult.ALLOW;
  }
}

class ContextCapturingPolicy extends EntityPrivacyPolicy<
  BlahFields,
  'id',
  ViewerContext,
  BlahEntity
> {
  public readonly createRule = new ContextCapturingRule();
  public readonly readRule = new ContextCapturingRule();
  public readonly updateRule = new ContextCapturingRule();
  public readonly deleteRule = new ContextCapturingRule();

  protected override readonly createRules = [this.createRule];
  protected override readonly readRules = [this.readRule];
  protected override readonly updateRules = [this.updateRule];
  protected override readonly deleteRules = [this.deleteRule];
}

enum TestSkipReason {
  NOT_OWNER = 'NOT_OWNER',
  NOT_MEMBER = 'NOT_MEMBER',
  BLOCKED = 'BLOCKED',
}

class SkipWithReasonRule extends PrivacyPolicyRule<BlahFields, 'id', ViewerContext, BlahEntity> {
  constructor(private readonly reason: TestSkipReason) {
    super();
  }

  async evaluateAsync(): Promise<RuleEvaluationOutcome> {
    return skipWithReasons(this.reason);
  }
}

class DenyWithReasonRule extends PrivacyPolicyRule<BlahFields, 'id', ViewerContext, BlahEntity> {
  async evaluateAsync(): Promise<RuleEvaluationOutcome> {
    return denyWithReasons(TestSkipReason.BLOCKED);
  }
}

class ReasonedDenialPolicy extends EntityPrivacyPolicy<
  BlahFields,
  'id',
  ViewerContext,
  BlahEntity
> {
  protected override readonly createRules = [
    new SkipWithReasonRule(TestSkipReason.NOT_OWNER),
    new AlwaysSkipPrivacyPolicyRule<BlahFields, 'id', ViewerContext, BlahEntity>(),
    new SkipWithReasonRule(TestSkipReason.NOT_MEMBER),
    new SkipWithReasonRule(TestSkipReason.NOT_OWNER),
  ];
  protected override readonly readRules = [
    new SkipWithReasonRule(TestSkipReason.NOT_OWNER),
    new AlwaysSkipPrivacyPolicyRule<BlahFields, 'id', ViewerContext, BlahEntity>(),
    new DenyWithReasonRule(),
    new AlwaysAllowPrivacyPolicyRule<BlahFields, 'id', ViewerContext, BlahEntity>(),
  ];
  protected override readonly updateRules = [
    new AllowIfAnySubRuleAllowsPrivacyPolicyRule<BlahFields, 'id', ViewerContext, BlahEntity>([
      new SkipWithReasonRule(TestSkipReason.NOT_OWNER),
      new AllowIfAllSubRulesAllowPrivacyPolicyRule<BlahFields, 'id', ViewerContext, BlahEntity>([
        new AlwaysAllowPrivacyPolicyRule<BlahFields, 'id', ViewerContext, BlahEntity>(),
        new SkipWithReasonRule(TestSkipReason.NOT_MEMBER),
      ]),
    ]),
    new EvaluateIfEntityFieldPredicatePrivacyPolicyRule<
      BlahFields,
      'id',
      ViewerContext,
      BlahEntity,
      'id'
    >('id', (id) => id === '1', new SkipWithReasonRule(TestSkipReason.BLOCKED)),
    new EvaluateIfEntityFieldPredicatePrivacyPolicyRule<
      BlahFields,
      'id',
      ViewerContext,
      BlahEntity,
      'id'
    >('id', (id) => id === 'never', new SkipWithReasonRule(TestSkipReason.NOT_OWNER)),
  ];
  protected override readonly deleteRules = [];

  protected override getUserFacingDenialReason(
    _viewerContext: ViewerContext,
    _action: EntityAuthorizationAction,
    denialReason: EntityNotAuthorizedDenialReason,
  ): EntityNotAuthorizedUserFacingReason | null {
    if (
      denialReason.type === EntityNotAuthorizedDenialType.ALL_RULES_SKIPPED &&
      denialReason.skippedRules.some((skippedRule) =>
        skippedRule.reasons.includes(TestSkipReason.NOT_MEMBER),
      )
    ) {
      return { code: 'MUST_BE_MEMBER', message: 'You must be a member to do this.' };
    }
    return null;
  }
}

describe(EntityPrivacyPolicy, () => {
  describe(EntityPrivacyPolicyEvaluationMode.ENFORCE.toString(), () => {
    it('throws EntityNotAuthorizedError when deny', async () => {
      const viewerContext = instance(mock(ViewerContext));
      const queryContext = instance(mock(EntityQueryContext));
      const privacyPolicyEvaluationContext =
        instance(
          mock<EntityPrivacyPolicyEvaluationContext<BlahFields, 'id', ViewerContext, BlahEntity>>(),
        );
      const metricsAdapterMock = mock<IEntityMetricsAdapter>();
      const metricsAdapter = instance(metricsAdapterMock);
      const entity = new BlahEntity({
        viewerContext,
        id: '1',
        databaseFields: { id: '1' },
        selectedFields: { id: '1' },
      });
      const policy = new AlwaysDenyPolicy();
      await expect(
        policy.authorizeCreateAsync(
          viewerContext,
          queryContext,
          privacyPolicyEvaluationContext,
          entity,
          metricsAdapter,
        ),
      ).rejects.toBeInstanceOf(EntityNotAuthorizedError);
      verify(
        metricsAdapterMock.logAuthorizationEvent(
          objectContaining({
            entityClassName: entity.constructor.name,
            action: EntityAuthorizationAction.CREATE,
            evaluationResult: EntityMetricsAuthorizationResult.DENY,
            privacyPolicyEvaluationMode: EntityPrivacyPolicyEvaluationMode.ENFORCE,
          }),
        ),
      ).once();
    });

    it('returns entity when allowed', async () => {
      const viewerContext = instance(mock(ViewerContext));
      const queryContext = instance(mock(EntityQueryContext));
      const privacyPolicyEvaluationContext =
        instance(
          mock<EntityPrivacyPolicyEvaluationContext<BlahFields, 'id', ViewerContext, BlahEntity>>(),
        );
      const metricsAdapterMock = mock<IEntityMetricsAdapter>();
      const metricsAdapter = instance(metricsAdapterMock);
      const entity = new BlahEntity({
        viewerContext,
        id: '1',
        databaseFields: { id: '1' },
        selectedFields: { id: '1' },
      });
      const policy = new AlwaysAllowPolicy();
      const approvedEntity = await policy.authorizeCreateAsync(
        viewerContext,
        queryContext,
        privacyPolicyEvaluationContext,
        entity,
        metricsAdapter,
      );
      expect(approvedEntity).toEqual(entity);
      verify(
        metricsAdapterMock.logAuthorizationEvent(
          objectContaining({
            entityClassName: entity.constructor.name,
            action: EntityAuthorizationAction.CREATE,
            evaluationResult: EntityMetricsAuthorizationResult.ALLOW,
            privacyPolicyEvaluationMode: EntityPrivacyPolicyEvaluationMode.ENFORCE,
          }),
        ),
      ).once();
    });

    it('throws EntityNotAuthorizedError when all skipped', async () => {
      const viewerContext = instance(mock(ViewerContext));
      const queryContext = instance(mock(EntityQueryContext));
      const privacyPolicyEvaluationContext =
        instance(
          mock<EntityPrivacyPolicyEvaluationContext<BlahFields, 'id', ViewerContext, BlahEntity>>(),
        );
      const metricsAdapterMock = mock<IEntityMetricsAdapter>();
      const metricsAdapter = instance(metricsAdapterMock);
      const entity = new BlahEntity({
        viewerContext,
        id: '1',
        databaseFields: { id: '1' },
        selectedFields: { id: '1' },
      });
      const policy = new SkipAllPolicy();
      await expect(
        policy.authorizeCreateAsync(
          viewerContext,
          queryContext,
          privacyPolicyEvaluationContext,
          entity,
          metricsAdapter,
        ),
      ).rejects.toBeInstanceOf(EntityNotAuthorizedError);
      verify(
        metricsAdapterMock.logAuthorizationEvent(
          objectContaining({
            entityClassName: entity.constructor.name,
            action: EntityAuthorizationAction.CREATE,
            evaluationResult: EntityMetricsAuthorizationResult.DENY,
            privacyPolicyEvaluationMode: EntityPrivacyPolicyEvaluationMode.ENFORCE,
          }),
        ),
      ).once();
    });

    it('throws when an invalid result is returned', async () => {
      const viewerContext = instance(mock(ViewerContext));
      const queryContext = instance(mock(EntityQueryContext));
      const privacyPolicyEvaluationContext =
        instance(
          mock<EntityPrivacyPolicyEvaluationContext<BlahFields, 'id', ViewerContext, BlahEntity>>(),
        );
      const metricsAdapterMock = mock<IEntityMetricsAdapter>();
      const metricsAdapter = instance(metricsAdapterMock);
      const entity = new BlahEntity({
        viewerContext,
        id: '1',
        databaseFields: { id: '1' },
        selectedFields: { id: '1' },
      });
      const policy = new InvalidCreateRuleResultPolicy();
      await expect(
        policy.authorizeCreateAsync(
          viewerContext,
          queryContext,
          privacyPolicyEvaluationContext,
          entity,
          metricsAdapter,
        ),
      ).rejects.toThrow('Invalid RuleEvaluationResult returned from rule');
    });

    it('throws EntityNotAuthorizedError when empty policy', async () => {
      const viewerContext = instance(mock(ViewerContext));
      const queryContext = instance(mock(EntityQueryContext));
      const privacyPolicyEvaluationContext =
        instance(
          mock<EntityPrivacyPolicyEvaluationContext<BlahFields, 'id', ViewerContext, BlahEntity>>(),
        );
      const metricsAdapterMock = mock<IEntityMetricsAdapter>();
      const metricsAdapter = instance(metricsAdapterMock);
      const entity = new BlahEntity({
        viewerContext,
        id: '1',
        databaseFields: { id: '1' },
        selectedFields: { id: '1' },
      });
      const policy = new EmptyPolicy();
      await expect(
        policy.authorizeCreateAsync(
          viewerContext,
          queryContext,
          privacyPolicyEvaluationContext,
          entity,
          metricsAdapter,
        ),
      ).rejects.toBeInstanceOf(EntityNotAuthorizedError);
      verify(
        metricsAdapterMock.logAuthorizationEvent(
          objectContaining({
            entityClassName: entity.constructor.name,
            action: EntityAuthorizationAction.CREATE,
            evaluationResult: EntityMetricsAuthorizationResult.DENY,
            privacyPolicyEvaluationMode: EntityPrivacyPolicyEvaluationMode.ENFORCE,
          }),
        ),
      ).once();
    });

    it('throws when rule throws', async () => {
      const viewerContext = instance(mock(ViewerContext));
      const queryContext = instance(mock(EntityQueryContext));
      const privacyPolicyEvaluationContext =
        instance(
          mock<EntityPrivacyPolicyEvaluationContext<BlahFields, 'id', ViewerContext, BlahEntity>>(),
        );
      const metricsAdapterMock = mock<IEntityMetricsAdapter>();
      const metricsAdapter = instance(metricsAdapterMock);
      const entity = new BlahEntity({
        viewerContext,
        id: '1',
        databaseFields: { id: '1' },
        selectedFields: { id: '1' },
      });
      const policy = new ThrowAllPolicy();
      await expect(
        policy.authorizeCreateAsync(
          viewerContext,
          queryContext,
          privacyPolicyEvaluationContext,
          entity,
          metricsAdapter,
        ),
      ).rejects.toThrow('WooHoo!');
      verify(metricsAdapterMock.logAuthorizationEvent(anything())).never();
    });
  });

  describe(EntityPrivacyPolicyEvaluationMode.DRY_RUN.toString(), () => {
    it('returns entity when denied but calls denialHandler', async () => {
      const viewerContext = instance(mock(ViewerContext));
      const queryContext = instance(mock(EntityQueryContext));
      const privacyPolicyEvaluationContext =
        instance(
          mock<EntityPrivacyPolicyEvaluationContext<BlahFields, 'id', ViewerContext, BlahEntity>>(),
        );
      const metricsAdapterMock = mock<IEntityMetricsAdapter>();
      const metricsAdapter = instance(metricsAdapterMock);
      const entity = new BlahEntity({
        viewerContext,
        id: '1',
        databaseFields: { id: '1' },
        selectedFields: { id: '1' },
      });
      const policy = new DryRunAlwaysDenyPolicy();

      const policySpy = spy(policy);

      const approvedEntity = await policy.authorizeCreateAsync(
        viewerContext,
        queryContext,
        privacyPolicyEvaluationContext,
        entity,
        metricsAdapter,
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
          }),
        ),
      ).once();
    });

    it('does not log when not denied', async () => {
      const viewerContext = instance(mock(ViewerContext));
      const queryContext = instance(mock(EntityQueryContext));
      const privacyPolicyEvaluationContext =
        instance(
          mock<EntityPrivacyPolicyEvaluationContext<BlahFields, 'id', ViewerContext, BlahEntity>>(),
        );
      const metricsAdapterMock = mock<IEntityMetricsAdapter>();
      const metricsAdapter = instance(metricsAdapterMock);
      const entity = new BlahEntity({
        viewerContext,
        id: '1',
        databaseFields: { id: '1' },
        selectedFields: { id: '1' },
      });
      const policy = new DryRunAlwaysAllowPolicy();

      const policySpy = spy(policy);

      const approvedEntity = await policy.authorizeCreateAsync(
        viewerContext,
        queryContext,
        privacyPolicyEvaluationContext,
        entity,
        metricsAdapter,
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
          }),
        ),
      ).once();
    });

    it('passes through other errors', async () => {
      const viewerContext = instance(mock(ViewerContext));
      const queryContext = instance(mock(EntityQueryContext));
      const privacyPolicyEvaluationContext =
        instance(
          mock<EntityPrivacyPolicyEvaluationContext<BlahFields, 'id', ViewerContext, BlahEntity>>(),
        );
      const metricsAdapterMock = mock<IEntityMetricsAdapter>();
      const metricsAdapter = instance(metricsAdapterMock);
      const entity = new BlahEntity({
        viewerContext,
        id: '1',
        databaseFields: { id: '1' },
        selectedFields: { id: '1' },
      });
      const policy = new DryRunThrowAllPolicy();

      const policySpy = spy(policy);

      await expect(
        policy.authorizeCreateAsync(
          viewerContext,
          queryContext,
          privacyPolicyEvaluationContext,
          entity,
          metricsAdapter,
        ),
      ).rejects.toThrow('WooHoo!');

      verify(policySpy.denyHandler(anyOfClass(EntityNotAuthorizedError))).never();

      verify(metricsAdapterMock.logAuthorizationEvent(anything())).never();
    });
  });

  describe(EntityPrivacyPolicyEvaluationMode.ENFORCE_AND_LOG.toString(), () => {
    it('denies when denied but calls denialHandler', async () => {
      const viewerContext = instance(mock(ViewerContext));
      const queryContext = instance(mock(EntityQueryContext));
      const privacyPolicyEvaluationContext =
        instance(
          mock<EntityPrivacyPolicyEvaluationContext<BlahFields, 'id', ViewerContext, BlahEntity>>(),
        );
      const metricsAdapterMock = mock<IEntityMetricsAdapter>();
      const metricsAdapter = instance(metricsAdapterMock);
      const entity = new BlahEntity({
        viewerContext,
        id: '1',
        databaseFields: { id: '1' },
        selectedFields: { id: '1' },
      });
      const policy = new LoggingEnforceAlwaysDenyPolicy();

      const policySpy = spy(policy);

      await expect(
        policy.authorizeCreateAsync(
          viewerContext,
          queryContext,
          privacyPolicyEvaluationContext,
          entity,
          metricsAdapter,
        ),
      ).rejects.toBeInstanceOf(EntityNotAuthorizedError);

      verify(policySpy.denyHandler(anyOfClass(EntityNotAuthorizedError))).once();

      verify(
        metricsAdapterMock.logAuthorizationEvent(
          objectContaining({
            entityClassName: entity.constructor.name,
            action: EntityAuthorizationAction.CREATE,
            evaluationResult: EntityMetricsAuthorizationResult.DENY,
            privacyPolicyEvaluationMode: EntityPrivacyPolicyEvaluationMode.ENFORCE_AND_LOG,
          }),
        ),
      ).once();
    });

    it('does not log when not denied', async () => {
      const viewerContext = instance(mock(ViewerContext));
      const queryContext = instance(mock(EntityQueryContext));
      const privacyPolicyEvaluationContext =
        instance(
          mock<EntityPrivacyPolicyEvaluationContext<BlahFields, 'id', ViewerContext, BlahEntity>>(),
        );
      const metricsAdapterMock = mock<IEntityMetricsAdapter>();
      const metricsAdapter = instance(metricsAdapterMock);
      const entity = new BlahEntity({
        viewerContext,
        id: '1',
        databaseFields: { id: '1' },
        selectedFields: { id: '1' },
      });
      const policy = new LoggingEnforceAlwaysAllowPolicy();

      const policySpy = spy(policy);

      const approvedEntity = await policy.authorizeCreateAsync(
        viewerContext,
        queryContext,
        privacyPolicyEvaluationContext,
        entity,
        metricsAdapter,
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
          }),
        ),
      ).once();
    });

    it('passes through other errors', async () => {
      const viewerContext = instance(mock(ViewerContext));
      const queryContext = instance(mock(EntityQueryContext));
      const privacyPolicyEvaluationContext =
        instance(
          mock<EntityPrivacyPolicyEvaluationContext<BlahFields, 'id', ViewerContext, BlahEntity>>(),
        );
      const metricsAdapterMock = mock<IEntityMetricsAdapter>();
      const metricsAdapter = instance(metricsAdapterMock);
      const entity = new BlahEntity({
        viewerContext,
        id: '1',
        databaseFields: { id: '1' },
        selectedFields: { id: '1' },
      });
      const policy = new LoggingEnforceThrowAllPolicy();

      const policySpy = spy(policy);

      await expect(
        policy.authorizeCreateAsync(
          viewerContext,
          queryContext,
          privacyPolicyEvaluationContext,
          entity,
          metricsAdapter,
        ),
      ).rejects.toThrow('WooHoo!');

      verify(policySpy.denyHandler(anyOfClass(EntityNotAuthorizedError))).never();

      verify(metricsAdapterMock.logAuthorizationEvent(anything())).never();
    });
  });

  describe('denial reasons', () => {
    const setup = (): {
      viewerContext: ViewerContext;
      queryContext: EntityQueryContext;
      privacyPolicyEvaluationContext: EntityPrivacyPolicyEvaluationContext<
        BlahFields,
        'id',
        ViewerContext,
        BlahEntity
      >;
      metricsAdapter: IEntityMetricsAdapter;
      entity: BlahEntity;
    } => {
      const viewerContext = instance(mock(ViewerContext));
      const queryContext = instance(mock(EntityQueryContext));
      const privacyPolicyEvaluationContext =
        instance(
          mock<EntityPrivacyPolicyEvaluationContext<BlahFields, 'id', ViewerContext, BlahEntity>>(),
        );
      const metricsAdapter = instance(mock<IEntityMetricsAdapter>());
      const entity = new BlahEntity({
        viewerContext,
        id: '1',
        databaseFields: { id: '1' },
        selectedFields: { id: '1' },
      });
      return {
        viewerContext,
        queryContext,
        privacyPolicyEvaluationContext,
        metricsAdapter,
        entity,
      };
    };

    const rejectionOf = async <T>(
      promise: Promise<T>,
    ): Promise<EntityNotAuthorizedError<BlahFields, 'id', ViewerContext, BlahEntity>> => {
      try {
        await promise;
      } catch (e) {
        expect(e).toBeInstanceOf(EntityNotAuthorizedError);
        return e as EntityNotAuthorizedError<BlahFields, 'id', ViewerContext, BlahEntity>;
      }
      throw new Error('expected rejection');
    };

    it('collects reasons from all skipped rules and passes them to the policy handler', async () => {
      const {
        viewerContext,
        queryContext,
        privacyPolicyEvaluationContext,
        metricsAdapter,
        entity,
      } = setup();
      const policy = new ReasonedDenialPolicy();
      const error = await rejectionOf(
        policy.authorizeCreateAsync(
          viewerContext,
          queryContext,
          privacyPolicyEvaluationContext,
          entity,
          metricsAdapter,
        ),
      );
      expect(error.action).toBe(EntityAuthorizationAction.CREATE);
      expect(error.entityClassName).toBe('BlahEntity');
      expect(error.entityID).toBe('1');
      expect(error.denialReason).toEqual({
        type: EntityNotAuthorizedDenialType.ALL_RULES_SKIPPED,
        skippedRules: [
          { ruleIndex: 0, ruleName: 'SkipWithReasonRule', reasons: [TestSkipReason.NOT_OWNER] },
          { ruleIndex: 1, ruleName: 'AlwaysSkipPrivacyPolicyRule', reasons: [] },
          { ruleIndex: 2, ruleName: 'SkipWithReasonRule', reasons: [TestSkipReason.NOT_MEMBER] },
          { ruleIndex: 3, ruleName: 'SkipWithReasonRule', reasons: [TestSkipReason.NOT_OWNER] },
        ],
      });
      expect(error.message).toContain('action = CREATE, ruleIndex = -1)');
      expect(error.message).not.toContain('SkipWithReasonRule');
      expect(error.message).not.toContain('NOT_OWNER');
      expect(error.userFacingDenialReason).toEqual({
        code: 'MUST_BE_MEMBER',
        message: 'You must be a member to do this.',
      });
    });

    it('identifies the denying rule and the rules skipped before it when a rule denies', async () => {
      const {
        viewerContext,
        queryContext,
        privacyPolicyEvaluationContext,
        metricsAdapter,
        entity,
      } = setup();
      const policy = new ReasonedDenialPolicy();
      const error = await rejectionOf(
        policy.authorizeReadAsync(
          viewerContext,
          queryContext,
          privacyPolicyEvaluationContext,
          entity,
          metricsAdapter,
        ),
      );
      expect(error.denialReason).toEqual({
        type: EntityNotAuthorizedDenialType.RULE_DENIED,
        rule: { ruleIndex: 2, ruleName: 'DenyWithReasonRule', reasons: [TestSkipReason.BLOCKED] },
        skippedRules: [
          { ruleIndex: 0, ruleName: 'SkipWithReasonRule', reasons: [TestSkipReason.NOT_OWNER] },
          { ruleIndex: 1, ruleName: 'AlwaysSkipPrivacyPolicyRule', reasons: [] },
        ],
      });
      expect(error.message).toContain('action = READ, ruleIndex = 2)');
      expect(error.message).not.toContain('BLOCKED');
      expect(error.userFacingDenialReason).toBeNull();
    });

    it('surfaces reasons from sub-rules of composite rules', async () => {
      const {
        viewerContext,
        queryContext,
        privacyPolicyEvaluationContext,
        metricsAdapter,
        entity,
      } = setup();
      const policy = new ReasonedDenialPolicy();
      const error = await rejectionOf(
        policy.authorizeUpdateAsync(
          viewerContext,
          queryContext,
          privacyPolicyEvaluationContext,
          entity,
          metricsAdapter,
        ),
      );
      expect(error.denialReason).toEqual({
        type: EntityNotAuthorizedDenialType.ALL_RULES_SKIPPED,
        skippedRules: [
          {
            ruleIndex: 0,
            ruleName: 'AllowIfAnySubRuleAllowsPrivacyPolicyRule',
            reasons: [TestSkipReason.NOT_OWNER, TestSkipReason.NOT_MEMBER],
          },
          {
            ruleIndex: 1,
            ruleName: 'EvaluateIfEntityFieldPredicatePrivacyPolicyRule',
            reasons: [TestSkipReason.BLOCKED],
          },
          {
            ruleIndex: 2,
            ruleName: 'EvaluateIfEntityFieldPredicatePrivacyPolicyRule',
            reasons: [],
          },
        ],
      });
    });

    it('reports an empty ruleset', async () => {
      const {
        viewerContext,
        queryContext,
        privacyPolicyEvaluationContext,
        metricsAdapter,
        entity,
      } = setup();
      const policy = new ReasonedDenialPolicy();
      const error = await rejectionOf(
        policy.authorizeDeleteAsync(
          viewerContext,
          queryContext,
          privacyPolicyEvaluationContext,
          entity,
          metricsAdapter,
        ),
      );
      expect(error.denialReason).toEqual({
        type: EntityNotAuthorizedDenialType.ALL_RULES_SKIPPED,
        skippedRules: [],
      });
      expect(error.message).toContain('ruleIndex = -1)');
      expect(error.userFacingDenialReason).toBeNull();
    });
  });

  describe('EntityPrivacyPolicyRuleEvaluationContext', () => {
    it('passes correct authorization action to rules for each CRUD operation', async () => {
      const viewerContext = instance(mock(ViewerContext));
      const queryContext = instance(mock(EntityQueryContext));
      const privacyPolicyEvaluationContext: EntityPrivacyPolicyEvaluationContext<
        BlahFields,
        'id',
        ViewerContext,
        BlahEntity
      > = {
        previousValue: null,
        cascadingDeleteCause: null,
      };
      const metricsAdapter = instance(mock<IEntityMetricsAdapter>());
      const entity = new BlahEntity({
        viewerContext,
        id: '1',
        databaseFields: { id: '1' },
        selectedFields: { id: '1' },
      });
      const policy = new ContextCapturingPolicy();

      await policy.authorizeCreateAsync(
        viewerContext,
        queryContext,
        privacyPolicyEvaluationContext,
        entity,
        metricsAdapter,
      );
      expect(policy.createRule.capturedContext?.action).toBe(EntityAuthorizationAction.CREATE);

      await policy.authorizeReadAsync(
        viewerContext,
        queryContext,
        privacyPolicyEvaluationContext,
        entity,
        metricsAdapter,
      );
      expect(policy.readRule.capturedContext?.action).toBe(EntityAuthorizationAction.READ);

      await policy.authorizeUpdateAsync(
        viewerContext,
        queryContext,
        privacyPolicyEvaluationContext,
        entity,
        metricsAdapter,
      );
      expect(policy.updateRule.capturedContext?.action).toBe(EntityAuthorizationAction.UPDATE);

      await policy.authorizeDeleteAsync(
        viewerContext,
        queryContext,
        privacyPolicyEvaluationContext,
        entity,
        metricsAdapter,
      );
      expect(policy.deleteRule.capturedContext?.action).toBe(EntityAuthorizationAction.DELETE);
    });
  });
});

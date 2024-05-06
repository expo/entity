import { mock, instance } from 'ts-mockito';

import Entity from '../Entity';
import { EntityCompanionDefinition } from '../EntityCompanionProvider';
import EntityConfiguration from '../EntityConfiguration';
import { UUIDField } from '../EntityFields';
import EntityPrivacyPolicy, { EntityPrivacyPolicyEvaluationContext } from '../EntityPrivacyPolicy';
import { EntityQueryContext } from '../EntityQueryContext';
import ViewerContext from '../ViewerContext';
import IEntityMetricsAdapter from '../metrics/IEntityMetricsAdapter';
import { RuleComplexity, RuleEvaluationResult } from '../rules/PrivacyPolicyRuleEnums';
import {
  AllowOrSkipPrivacyPolicyRule,
  DenyOrSkipPrivacyPolicyRule,
  SkipPrivacyPolicyRule,
} from '../rules/PrivacyPolicyRuleTypes';

type BlahFields = {
  id: string;
};

class BlahEntity extends Entity<BlahFields, string, ViewerContext> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    BlahFields,
    string,
    ViewerContext,
    BlahEntity,
    any
  > {
    return {
      entityClass: BlahEntity,
      entityConfiguration: new EntityConfiguration<BlahFields>({
        idField: 'id',
        tableName: 'blah_table',
        schema: {
          id: new UUIDField({
            columnName: 'id',
          }),
        },
        databaseAdapterFlavor: 'postgres',
        cacheAdapterFlavor: 'redis',
      }),
      privacyPolicyClass: ReorderablePolicy,
    };
  }
}

class LargeAsyncComplexityAllowRule extends AllowOrSkipPrivacyPolicyRule<
  BlahFields,
  string,
  ViewerContext,
  BlahEntity
> {
  override async evaluateAsync(): Promise<RuleEvaluationResult.SKIP | RuleEvaluationResult.ALLOW> {
    return RuleEvaluationResult.SKIP;
  }
  override complexity = RuleComplexity.LARGE_ASYNC;
}

class ConstantTimeComplexityAllowRule extends AllowOrSkipPrivacyPolicyRule<
  BlahFields,
  string,
  ViewerContext,
  BlahEntity
> {
  override async evaluateAsync(): Promise<RuleEvaluationResult.SKIP | RuleEvaluationResult.ALLOW> {
    return RuleEvaluationResult.SKIP;
  }
  override complexity = RuleComplexity.CONSTANT_TIME;
}

class LargeAsyncComplexitySkipRule extends SkipPrivacyPolicyRule<
  BlahFields,
  string,
  ViewerContext,
  BlahEntity
> {
  override async evaluateAsync(): Promise<RuleEvaluationResult.SKIP> {
    return RuleEvaluationResult.SKIP;
  }
  override complexity = RuleComplexity.LARGE_ASYNC;
}

class ConstantTimeComplexitySkipRule extends SkipPrivacyPolicyRule<
  BlahFields,
  string,
  ViewerContext,
  BlahEntity
> {
  override async evaluateAsync(): Promise<RuleEvaluationResult.SKIP> {
    return RuleEvaluationResult.SKIP;
  }
  override complexity = RuleComplexity.CONSTANT_TIME;
}

class LargeAsyncComplexityDenyRule extends DenyOrSkipPrivacyPolicyRule<
  BlahFields,
  string,
  ViewerContext,
  BlahEntity
> {
  override async evaluateAsync(): Promise<RuleEvaluationResult.SKIP | RuleEvaluationResult.DENY> {
    return RuleEvaluationResult.SKIP;
  }
  override complexity = RuleComplexity.LARGE_ASYNC;
}

class ConstantTimeComplexityDenyRule extends DenyOrSkipPrivacyPolicyRule<
  BlahFields,
  string,
  ViewerContext,
  BlahEntity
> {
  override async evaluateAsync(): Promise<RuleEvaluationResult.SKIP | RuleEvaluationResult.DENY> {
    return RuleEvaluationResult.SKIP;
  }
  override complexity = RuleComplexity.CONSTANT_TIME;
}

class ReorderablePolicy extends EntityPrivacyPolicy<BlahFields, string, ViewerContext, BlahEntity> {
  protected override shouldAutoReorderRulesAccordingToComplexity = true;

  protected override readonly createRules = [
    new LargeAsyncComplexityDenyRule(),
    new ConstantTimeComplexityDenyRule(),

    new LargeAsyncComplexityAllowRule(),
    new ConstantTimeComplexitySkipRule(),
    new ConstantTimeComplexityAllowRule(),

    new LargeAsyncComplexityDenyRule(),
    new LargeAsyncComplexitySkipRule(),
  ];
  protected override readonly readRules = [];
  protected override readonly updateRules = [];
  protected override readonly deleteRules = [];
}

class NonReorderablePolicy extends EntityPrivacyPolicy<
  BlahFields,
  string,
  ViewerContext,
  BlahEntity
> {
  protected override readonly createRules = [
    new LargeAsyncComplexityDenyRule(),
    new ConstantTimeComplexityDenyRule(),

    new LargeAsyncComplexityAllowRule(),
    new ConstantTimeComplexitySkipRule(),
    new ConstantTimeComplexityAllowRule(),

    new LargeAsyncComplexityDenyRule(),
    new LargeAsyncComplexitySkipRule(),
  ];
  protected override readonly readRules = [];
  protected override readonly updateRules = [];
  protected override readonly deleteRules = [];
}

describe(EntityPrivacyPolicy, () => {
  test('reorderable policy', async () => {
    const viewerContext = instance(mock(ViewerContext));
    const queryContext = instance(mock(EntityQueryContext));
    const privacyPolicyEvaluationContext = instance(mock<EntityPrivacyPolicyEvaluationContext>());
    const metricsAdapterMock = mock<IEntityMetricsAdapter>();
    const metricsAdapter = instance(metricsAdapterMock);
    const entity = new BlahEntity({
      viewerContext,
      id: '1',
      databaseFields: { id: '1' },
      selectedFields: { id: '1' },
    });
    const policy = new ReorderablePolicy();

    const spy0 = jest.spyOn(policy['createRules'][0]!, 'evaluateAsync');
    const spy1 = jest.spyOn(policy['createRules'][1]!, 'evaluateAsync');
    const spy2 = jest.spyOn(policy['createRules'][2]!, 'evaluateAsync');
    const spy3 = jest.spyOn(policy['createRules'][3]!, 'evaluateAsync');
    const spy4 = jest.spyOn(policy['createRules'][4]!, 'evaluateAsync');
    const spy5 = jest.spyOn(policy['createRules'][5]!, 'evaluateAsync');
    const spy6 = jest.spyOn(policy['createRules'][6]!, 'evaluateAsync');

    // this will deny since all rules skip, but we only care about rule evaluation order
    try {
      await policy.authorizeCreateAsync(
        viewerContext,
        queryContext,
        privacyPolicyEvaluationContext,
        entity,
        metricsAdapter
      );
    } catch {}

    const spy0CallOrder = spy0.mock.invocationCallOrder[0]!;
    const spy1CallOrder = spy1.mock.invocationCallOrder[0]!;
    const spy2CallOrder = spy2.mock.invocationCallOrder[0]!;
    const spy3CallOrder = spy3.mock.invocationCallOrder[0]!;
    const spy4CallOrder = spy4.mock.invocationCallOrder[0]!;
    const spy5CallOrder = spy5.mock.invocationCallOrder[0]!;
    const spy6CallOrder = spy6.mock.invocationCallOrder[0]!;

    // expected reordering: 1, 0, 3, 4, 2, 5, 6
    expect(spy1CallOrder).toBeLessThan(spy0CallOrder);
    expect(spy0CallOrder).toBeLessThan(spy3CallOrder);
    expect(spy3CallOrder).toBeLessThan(spy4CallOrder);
    expect(spy4CallOrder).toBeLessThan(spy2CallOrder);
    expect(spy2CallOrder).toBeLessThan(spy5CallOrder);
    expect(spy5CallOrder).toBeLessThan(spy6CallOrder);
  });

  test('non-reorderable policy', async () => {
    const viewerContext = instance(mock(ViewerContext));
    const queryContext = instance(mock(EntityQueryContext));
    const privacyPolicyEvaluationContext = instance(mock<EntityPrivacyPolicyEvaluationContext>());
    const metricsAdapterMock = mock<IEntityMetricsAdapter>();
    const metricsAdapter = instance(metricsAdapterMock);
    const entity = new BlahEntity({
      viewerContext,
      id: '1',
      databaseFields: { id: '1' },
      selectedFields: { id: '1' },
    });
    const policy = new NonReorderablePolicy();

    const spy0 = jest.spyOn(policy['createRules'][0]!, 'evaluateAsync');
    const spy1 = jest.spyOn(policy['createRules'][1]!, 'evaluateAsync');
    const spy2 = jest.spyOn(policy['createRules'][2]!, 'evaluateAsync');
    const spy3 = jest.spyOn(policy['createRules'][3]!, 'evaluateAsync');
    const spy4 = jest.spyOn(policy['createRules'][4]!, 'evaluateAsync');
    const spy5 = jest.spyOn(policy['createRules'][5]!, 'evaluateAsync');
    const spy6 = jest.spyOn(policy['createRules'][6]!, 'evaluateAsync');

    // this will deny since all rules skip, but we only care about rule evaluation order
    try {
      await policy.authorizeCreateAsync(
        viewerContext,
        queryContext,
        privacyPolicyEvaluationContext,
        entity,
        metricsAdapter
      );
    } catch {}

    const spy0CallOrder = spy0.mock.invocationCallOrder[0]!;
    const spy1CallOrder = spy1.mock.invocationCallOrder[0]!;
    const spy2CallOrder = spy2.mock.invocationCallOrder[0]!;
    const spy3CallOrder = spy3.mock.invocationCallOrder[0]!;
    const spy4CallOrder = spy4.mock.invocationCallOrder[0]!;
    const spy5CallOrder = spy5.mock.invocationCallOrder[0]!;
    const spy6CallOrder = spy6.mock.invocationCallOrder[0]!;

    // expected reordering: 0, 1, 2, 3, 4, 5, 6
    expect(spy0CallOrder).toBeLessThan(spy1CallOrder);
    expect(spy1CallOrder).toBeLessThan(spy2CallOrder);
    expect(spy2CallOrder).toBeLessThan(spy3CallOrder);
    expect(spy3CallOrder).toBeLessThan(spy4CallOrder);
    expect(spy4CallOrder).toBeLessThan(spy5CallOrder);
    expect(spy5CallOrder).toBeLessThan(spy6CallOrder);
  });
});

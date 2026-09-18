import { anything, instance, mock } from 'ts-mockito';

import type { EntityPrivacyPolicyRuleEvaluationContext } from '../../EntityPrivacyPolicy.ts';
import { EntityQueryContext } from '../../EntityQueryContext.ts';
import { ViewerContext } from '../../ViewerContext.ts';
import { describePrivacyPolicyRule } from '../../utils/__testfixtures__/PrivacyPolicyRuleTestUtils.ts';
import { AllowIfAllSubRulesAllowPrivacyPolicyRule } from '../AllowIfAllSubRulesAllowPrivacyPolicyRule.ts';
import { AlwaysAllowPrivacyPolicyRule } from '../AlwaysAllowPrivacyPolicyRule.ts';
import { AlwaysDenyPrivacyPolicyRule } from '../AlwaysDenyPrivacyPolicyRule.ts';
import { AlwaysSkipPrivacyPolicyRule } from '../AlwaysSkipPrivacyPolicyRule.ts';
import type { RuleEvaluationOutcome } from '../PrivacyPolicyRule.ts';
import { PrivacyPolicyRule, skipWithReasons } from '../PrivacyPolicyRule.ts';

class SkipWithReasonRule extends PrivacyPolicyRule<any, any, any, any, any> {
  constructor(private readonly reason: string) {
    super();
  }

  async evaluateAsync(): Promise<RuleEvaluationOutcome> {
    return skipWithReasons(this.reason);
  }
}

describePrivacyPolicyRule(
  new AllowIfAllSubRulesAllowPrivacyPolicyRule([
    new AlwaysAllowPrivacyPolicyRule(),
    new AlwaysSkipPrivacyPolicyRule(),
  ]),
  {
    skipCases: [
      {
        viewerContext: instance(mock(ViewerContext)),
        queryContext: instance(mock(EntityQueryContext)),
        evaluationContext:
          instance(mock<EntityPrivacyPolicyRuleEvaluationContext<any, any, any, any, any>>()),
        entity: anything(),
      },
    ],
  },
);

describePrivacyPolicyRule(
  new AllowIfAllSubRulesAllowPrivacyPolicyRule([
    new AlwaysAllowPrivacyPolicyRule(),
    new AlwaysDenyPrivacyPolicyRule(),
  ]),
  {
    skipCases: [
      {
        viewerContext: instance(mock(ViewerContext)),
        queryContext: instance(mock(EntityQueryContext)),
        evaluationContext:
          instance(mock<EntityPrivacyPolicyRuleEvaluationContext<any, any, any, any, any>>()),
        entity: anything(),
      },
    ],
  },
);

describePrivacyPolicyRule(
  new AllowIfAllSubRulesAllowPrivacyPolicyRule([
    new AlwaysAllowPrivacyPolicyRule(),
    new AlwaysAllowPrivacyPolicyRule(),
  ]),
  {
    allowCases: [
      {
        viewerContext: instance(mock(ViewerContext)),
        queryContext: instance(mock(EntityQueryContext)),
        evaluationContext:
          instance(mock<EntityPrivacyPolicyRuleEvaluationContext<any, any, any, any, any>>()),
        entity: anything(),
      },
    ],
  },
);

describePrivacyPolicyRule(new AllowIfAllSubRulesAllowPrivacyPolicyRule([]), {
  skipCases: [
    {
      viewerContext: instance(mock(ViewerContext)),
      queryContext: instance(mock(EntityQueryContext)),
      evaluationContext:
        instance(mock<EntityPrivacyPolicyRuleEvaluationContext<any, any, any, any, any>>()),
      entity: anything(),
    },
  ],
});

describePrivacyPolicyRule(
  new AllowIfAllSubRulesAllowPrivacyPolicyRule([
    new AlwaysAllowPrivacyPolicyRule(),
    new SkipWithReasonRule('NOT_OWNER'),
    new AlwaysSkipPrivacyPolicyRule(),
    new SkipWithReasonRule('NOT_MEMBER'),
  ]),
  {
    skipCases: [
      {
        viewerContext: instance(mock(ViewerContext)),
        queryContext: instance(mock(EntityQueryContext)),
        evaluationContext:
          instance(mock<EntityPrivacyPolicyRuleEvaluationContext<any, any, any, any, any>>()),
        entity: anything(),
        expectedReasons: ['NOT_OWNER', 'NOT_MEMBER'],
      },
    ],
  },
);

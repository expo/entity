import { anything, instance, mock } from 'ts-mockito';

import type { EntityPrivacyPolicyRuleEvaluationContext } from '../../EntityPrivacyPolicy.ts';
import { EntityQueryContext } from '../../EntityQueryContext.ts';
import { ViewerContext } from '../../ViewerContext.ts';
import { describePrivacyPolicyRule } from '../../utils/__testfixtures__/PrivacyPolicyRuleTestUtils.ts';
import { AllowIfAnySubRuleAllowsPrivacyPolicyRule } from '../AllowIfAnySubRuleAllowsPrivacyPolicyRule.ts';
import { AlwaysAllowPrivacyPolicyRule } from '../AlwaysAllowPrivacyPolicyRule.ts';
import { AlwaysDenyPrivacyPolicyRule } from '../AlwaysDenyPrivacyPolicyRule.ts';
import { AlwaysSkipPrivacyPolicyRule } from '../AlwaysSkipPrivacyPolicyRule.ts';

describePrivacyPolicyRule(
  new AllowIfAnySubRuleAllowsPrivacyPolicyRule([
    new AlwaysAllowPrivacyPolicyRule(),
    new AlwaysSkipPrivacyPolicyRule(),
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

describePrivacyPolicyRule(
  new AllowIfAnySubRuleAllowsPrivacyPolicyRule([
    new AlwaysAllowPrivacyPolicyRule(),
    new AlwaysDenyPrivacyPolicyRule(),
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

describePrivacyPolicyRule(
  new AllowIfAnySubRuleAllowsPrivacyPolicyRule([
    new AlwaysSkipPrivacyPolicyRule(),
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

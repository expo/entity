import { anything, instance, mock } from 'ts-mockito';

import type { EntityPrivacyPolicyRuleEvaluationContext } from '../../EntityPrivacyPolicy.ts';
import { EntityQueryContext } from '../../EntityQueryContext.ts';
import { ViewerContext } from '../../ViewerContext.ts';
import { describePrivacyPolicyRule } from '../../utils/__testfixtures__/PrivacyPolicyRuleTestUtils.ts';
import { AlwaysSkipPrivacyPolicyRule } from '../AlwaysSkipPrivacyPolicyRule.ts';

describePrivacyPolicyRule(new AlwaysSkipPrivacyPolicyRule(), {
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

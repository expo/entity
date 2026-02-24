import { anything, instance, mock } from 'ts-mockito';

import { EntityPrivacyPolicyEvaluationContext } from '../../EntityPrivacyPolicy';
import { EntityQueryContext } from '../../EntityQueryContext';
import { ViewerContext } from '../../ViewerContext';
import { describePrivacyPolicyRule } from '../../utils/__testfixtures__/PrivacyPolicyRuleTestUtils';
import { AllowIfAnySubRuleAllowsPrivacyPolicyRule } from '../AllowIfAnySubRuleAllowsPrivacyPolicyRule';
import { AlwaysAllowPrivacyPolicyRule } from '../AlwaysAllowPrivacyPolicyRule';
import { AlwaysDenyPrivacyPolicyRule } from '../AlwaysDenyPrivacyPolicyRule';
import { AlwaysSkipPrivacyPolicyRule } from '../AlwaysSkipPrivacyPolicyRule';

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
          instance(mock<EntityPrivacyPolicyEvaluationContext<any, any, any, any, any>>()),
        entity: anything(),
        action: anything(),
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
          instance(mock<EntityPrivacyPolicyEvaluationContext<any, any, any, any, any>>()),
        entity: anything(),
        action: anything(),
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
          instance(mock<EntityPrivacyPolicyEvaluationContext<any, any, any, any, any>>()),
        entity: anything(),
        action: anything(),
      },
    ],
  },
);

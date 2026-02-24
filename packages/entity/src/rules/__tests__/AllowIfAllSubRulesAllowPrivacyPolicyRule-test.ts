import { anything, instance, mock } from 'ts-mockito';

import { EntityPrivacyPolicyRuleEvaluationContext } from '../../EntityPrivacyPolicy';
import { EntityQueryContext } from '../../EntityQueryContext';
import { ViewerContext } from '../../ViewerContext';
import { describePrivacyPolicyRule } from '../../utils/__testfixtures__/PrivacyPolicyRuleTestUtils';
import { AllowIfAllSubRulesAllowPrivacyPolicyRule } from '../AllowIfAllSubRulesAllowPrivacyPolicyRule';
import { AlwaysAllowPrivacyPolicyRule } from '../AlwaysAllowPrivacyPolicyRule';
import { AlwaysDenyPrivacyPolicyRule } from '../AlwaysDenyPrivacyPolicyRule';
import { AlwaysSkipPrivacyPolicyRule } from '../AlwaysSkipPrivacyPolicyRule';

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

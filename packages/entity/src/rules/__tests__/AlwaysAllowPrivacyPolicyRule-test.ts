import { mock, instance, anything } from 'ts-mockito';

import { EntityPrivacyPolicyEvaluationContext } from '../../EntityPrivacyPolicy';
import { EntityQueryContext } from '../../EntityQueryContext';
import ViewerContext from '../../ViewerContext';
import { describePrivacyPolicyRule } from '../../utils/testing/PrivacyPolicyRuleTestUtils';
import AlwaysAllowPrivacyPolicyRule from '../AlwaysAllowPrivacyPolicyRule';

describePrivacyPolicyRule(new AlwaysAllowPrivacyPolicyRule(), {
  allowCases: [
    {
      viewerContext: instance(mock(ViewerContext)),
      queryContext: instance(mock(EntityQueryContext)),
      evaluationContext: instance(
        mock<EntityPrivacyPolicyEvaluationContext<any, any, any, any, any>>()
      ),
      entity: anything(),
    },
  ],
});

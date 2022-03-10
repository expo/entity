import { mock, instance, anything } from 'ts-mockito';

import { EntityPrivacyPolicyEvaluationContext } from '../../EntityPrivacyPolicy';
import { EntityQueryContext } from '../../EntityQueryContext';
import ViewerContext from '../../ViewerContext';
import { describePrivacyPolicyRule } from '../../utils/testing/PrivacyPolicyRuleTestUtils';
import AlwaysDenyPrivacyPolicyRule from '../AlwaysDenyPrivacyPolicyRule';

describePrivacyPolicyRule(new AlwaysDenyPrivacyPolicyRule(), {
  denyCases: [
    {
      viewerContext: instance(mock(ViewerContext)),
      queryContext: instance(mock(EntityQueryContext)),
      evaluationContext: instance(mock<EntityPrivacyPolicyEvaluationContext>()),
      entity: anything(),
    },
  ],
});

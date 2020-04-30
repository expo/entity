import { mock, instance, anything } from 'ts-mockito';

import { EntityQueryContext } from '../../EntityQueryContext';
import ViewerContext from '../../ViewerContext';
import AlwaysAllowPrivacyPolicyRule from '../AlwaysAllowPrivacyPolicyRule';
import { describePrivacyPolicyRule } from '../PrivacyPolicyRuleTestUtils';

describePrivacyPolicyRule(new AlwaysAllowPrivacyPolicyRule(), {
  allowCases: [
    {
      viewerContext: instance(mock(ViewerContext)),
      queryContext: instance(mock(EntityQueryContext)),
      entity: anything(),
    },
  ],
});

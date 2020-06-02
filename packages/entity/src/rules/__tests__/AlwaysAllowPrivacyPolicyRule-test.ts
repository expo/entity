import { mock, instance, anything } from 'ts-mockito';

import { EntityQueryContext } from '../../EntityQueryContext';
import ViewerContext from '../../ViewerContext';
import { describePrivacyPolicyRule } from '../../utils/testing/PrivacyPolicyRuleTestUtils';
import AlwaysAllowPrivacyPolicyRule from '../AlwaysAllowPrivacyPolicyRule';

describePrivacyPolicyRule(new AlwaysAllowPrivacyPolicyRule(), {
  allowCases: [
    {
      viewerContext: instance(mock(ViewerContext)),
      queryContext: instance(mock(EntityQueryContext)),
      entity: anything(),
    },
  ],
});

import { mock, instance, anything } from 'ts-mockito';

import { EntityQueryContext } from '../../EntityQueryContext';
import ViewerContext from '../../ViewerContext';
import AlwaysSkipPrivacyPolicyRule from '../AlwaysSkipPrivacyPolicyRule';
import { describePrivacyPolicyRule } from '../PrivacyPolicyRuleTestUtils';

describePrivacyPolicyRule(new AlwaysSkipPrivacyPolicyRule(), {
  skipCases: [
    {
      viewerContext: instance(mock(ViewerContext)),
      queryContext: instance(mock(EntityQueryContext)),
      entity: anything(),
    },
  ],
});

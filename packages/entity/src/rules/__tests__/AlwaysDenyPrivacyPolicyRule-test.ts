import { mock, instance, anything } from 'ts-mockito';

import { EntityQueryContext } from '../../EntityQueryContext';
import ViewerContext from '../../ViewerContext';
import { describePrivacyPolicyRule } from '../../testfixtures/PrivacyPolicyRuleTestUtils';
import AlwaysDenyPrivacyPolicyRule from '../AlwaysDenyPrivacyPolicyRule';

describePrivacyPolicyRule(new AlwaysDenyPrivacyPolicyRule(), {
  denyCases: [
    {
      viewerContext: instance(mock(ViewerContext)),
      queryContext: instance(mock(EntityQueryContext)),
      entity: anything(),
    },
  ],
});

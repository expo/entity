import { mock, instance, anything } from 'ts-mockito';

import { EntityQueryContext } from '../../EntityQueryContext';
import ViewerContext from '../../ViewerContext';
import AlwaysDenyPrivacyPolicyRule from '../AlwaysDenyPrivacyPolicyRule';
import { describePrivacyPolicyRule } from '../PrivacyPolicyRuleTestUtils';

describePrivacyPolicyRule(new AlwaysDenyPrivacyPolicyRule(), {
  denyCases: [
    {
      viewerContext: instance(mock(ViewerContext)),
      queryContext: instance(mock(EntityQueryContext)),
      entity: anything(),
    },
  ],
});

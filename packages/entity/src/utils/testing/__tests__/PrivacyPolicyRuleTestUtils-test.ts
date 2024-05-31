import { anything, instance, mock } from 'ts-mockito';

import { EntityPrivacyPolicyEvaluationContext } from '../../../EntityPrivacyPolicy';
import { EntityQueryContext } from '../../../EntityQueryContext';
import ViewerContext from '../../../ViewerContext';
import AlwaysAllowPrivacyPolicyRule from '../../../rules/AlwaysAllowPrivacyPolicyRule';
import AlwaysDenyPrivacyPolicyRule from '../../../rules/AlwaysDenyPrivacyPolicyRule';
import { describePrivacyPolicyRuleWithAsyncTestCase } from '../PrivacyPolicyRuleTestUtils';

describe(describePrivacyPolicyRuleWithAsyncTestCase, () => {
  describe('default args do not execute', () => {
    describePrivacyPolicyRuleWithAsyncTestCase(new AlwaysAllowPrivacyPolicyRule(), {
      allowCases: new Map([
        [
          'case',
          async () => ({
            viewerContext: instance(mock(ViewerContext)),
            queryContext: instance(mock(EntityQueryContext)),
            evaluationContext: instance(
              mock<EntityPrivacyPolicyEvaluationContext<any, any, any, any, any>>()
            ),
            entity: anything(),
          }),
        ],
      ]),
    });

    describePrivacyPolicyRuleWithAsyncTestCase(new AlwaysDenyPrivacyPolicyRule(), {
      denyCases: new Map([
        [
          'case',
          async () => ({
            viewerContext: instance(mock(ViewerContext)),
            queryContext: instance(mock(EntityQueryContext)),
            evaluationContext: instance(
              mock<EntityPrivacyPolicyEvaluationContext<any, any, any, any, any>>()
            ),
            entity: anything(),
          }),
        ],
      ]),
    });
  });
});

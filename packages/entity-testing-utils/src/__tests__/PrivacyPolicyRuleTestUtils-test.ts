import {
  EntityQueryContext,
  ViewerContext,
  AlwaysAllowPrivacyPolicyRule,
  AlwaysDenyPrivacyPolicyRule,
  EntityPrivacyPolicyRuleEvaluationContext,
} from '@expo/entity';
import { describe } from '@jest/globals';
import { anything, instance, mock } from 'ts-mockito';

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
            evaluationContext:
              instance(mock<EntityPrivacyPolicyRuleEvaluationContext<any, any, any, any, any>>()),
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
            evaluationContext:
              instance(mock<EntityPrivacyPolicyRuleEvaluationContext<any, any, any, any, any>>()),
            entity: anything(),
          }),
        ],
      ]),
    });
  });
});

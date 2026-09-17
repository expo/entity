import type { EntityPrivacyPolicyRuleEvaluationContext, RuleEvaluationOutcome } from '@expo/entity';
import {
  AlwaysAllowPrivacyPolicyRule,
  AlwaysDenyPrivacyPolicyRule,
  AlwaysSkipPrivacyPolicyRule,
  EntityQueryContext,
  PrivacyPolicyRule,
  ViewerContext,
  denyWithReasons,
  skipWithReasons,
} from '@expo/entity';
import { describe } from '@jest/globals';
import { anything, instance, mock } from 'ts-mockito';

import {
  describePrivacyPolicyRule,
  describePrivacyPolicyRuleWithAsyncTestCase,
} from '../PrivacyPolicyRuleTestUtils.ts';

class SkipWithReasonsRule extends PrivacyPolicyRule<any, any, any, any, any> {
  async evaluateAsync(): Promise<RuleEvaluationOutcome> {
    return skipWithReasons('NOT_OWNER', 'NOT_MEMBER');
  }
}

class DenyWithReasonsRule extends PrivacyPolicyRule<any, any, any, any, any> {
  async evaluateAsync(): Promise<RuleEvaluationOutcome> {
    return denyWithReasons('BLOCKED');
  }
}

const makeCase = (expectedReasons?: readonly string[]): any => ({
  viewerContext: instance(mock(ViewerContext)),
  queryContext: instance(mock(EntityQueryContext)),
  evaluationContext:
    instance(mock<EntityPrivacyPolicyRuleEvaluationContext<any, any, any, any, any>>()),
  entity: anything(),
  expectedReasons,
});

describe(describePrivacyPolicyRule, () => {
  describe('expectedReasons', () => {
    describePrivacyPolicyRule(new SkipWithReasonsRule(), {
      skipCases: [makeCase(), makeCase(['NOT_OWNER', 'NOT_MEMBER'])],
    });

    describePrivacyPolicyRule(new DenyWithReasonsRule(), {
      denyCases: [makeCase(), makeCase(['BLOCKED'])],
    });

    describePrivacyPolicyRule(new AlwaysSkipPrivacyPolicyRule(), {
      skipCases: [makeCase([])],
    });

    describePrivacyPolicyRule(new AlwaysDenyPrivacyPolicyRule(), {
      denyCases: [makeCase([])],
    });
  });
});

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

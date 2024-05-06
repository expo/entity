import { RuleComplexity, RuleEvaluationResultType } from '../../PrivacyPolicyRuleEnums';
import {
  groupRulesByResultType,
  reorderRulesByRuleComplexityGroups,
  sortGroupByComplexity,
} from '../PrivacyPolicyRuleOrdering';

type TestRuleJustResultType = { id: number; resultType: RuleEvaluationResultType };

describe(groupRulesByResultType, () => {
  const rule1 = { id: 1, resultType: RuleEvaluationResultType.ALLOW_OR_SKIP };
  const rule2 = { id: 2, resultType: RuleEvaluationResultType.ALLOW_OR_SKIP };
  const rule3 = { id: 3, resultType: RuleEvaluationResultType.SKIP };
  const rule4 = { id: 4, resultType: RuleEvaluationResultType.SKIP };
  const rule5 = { id: 5, resultType: RuleEvaluationResultType.DENY_OR_SKIP };
  const rule6 = { id: 6, resultType: RuleEvaluationResultType.DENY_OR_SKIP };

  test.each([
    // two adjacent of the same type should be grouped
    { ruleset: [rule1, rule2], expectedResultGroups: [[rule1, rule2]] },
    { ruleset: [rule3, rule4], expectedResultGroups: [[rule3, rule4]] },
    { ruleset: [rule5, rule6], expectedResultGroups: [[rule5, rule6]] },

    // two adjacent of ALLOW_OR_SKIP or DENY_OR_SKIP should not be grouped
    { ruleset: [rule1, rule5], expectedResultGroups: [[rule1], [rule5]] },
    { ruleset: [rule5, rule1], expectedResultGroups: [[rule5], [rule1]] },

    // adjacent (ALLOW_OR_SKIP and SKIP) or (DENY_OR_SKIP and SKIP) should be grouped
    { ruleset: [rule1, rule2, rule3], expectedResultGroups: [[rule1, rule2, rule3]] },
    { ruleset: [rule1, rule2, rule3, rule4], expectedResultGroups: [[rule1, rule2, rule3, rule4]] },
    { ruleset: [rule5, rule6, rule3], expectedResultGroups: [[rule5, rule6, rule3]] },
    { ruleset: [rule5, rule6, rule3, rule4], expectedResultGroups: [[rule5, rule6, rule3, rule4]] },

    // skip cases group with first group
    {
      ruleset: [rule1, rule2, rule3, rule4, rule5, rule6],
      expectedResultGroups: [
        [rule1, rule2, rule3, rule4],
        [rule5, rule6],
      ],
    },

    // skip in first N slots should take the first group type
    {
      ruleset: [rule3, rule4, rule1, rule2, rule5, rule6],
      expectedResultGroups: [
        [rule3, rule4, rule1, rule2],
        [rule5, rule6],
      ],
    },

    // lots of groups
    {
      ruleset: [rule1, rule5, rule3, rule2, rule6, rule4],
      expectedResultGroups: [[rule1], [rule5, rule3], [rule2], [rule6, rule4]],
    },

    // skip in first N slots
    {
      ruleset: [rule3, rule4, rule5, rule1],
      expectedResultGroups: [[rule3, rule4, rule5], [rule1]],
    },
  ])(
    'case %#',
    ({
      ruleset,
      expectedResultGroups,
    }: {
      ruleset: TestRuleJustResultType[];
      expectedResultGroups: TestRuleJustResultType[][];
    }) => {
      const resultGroups = groupRulesByResultType(ruleset);
      expect(resultGroups).toStrictEqual(expectedResultGroups);
    }
  );
});

type TestRuleJustComplexity = { id: number; complexity: RuleComplexity };

describe(sortGroupByComplexity, () => {
  const rule1 = { id: 1, complexity: RuleComplexity.CONSTANT_TIME };
  const rule2 = { id: 2, complexity: RuleComplexity.CONSTANT_TIME };
  const rule3 = { id: 3, complexity: RuleComplexity.SMALL_ASYNC };
  const rule5 = { id: 3, complexity: RuleComplexity.LARGE_ASYNC };

  test.each([
    { ruleGroup: [rule1, rule2], expectedRuleGroup: [rule1, rule2] },
    { ruleGroup: [rule1, rule3], expectedRuleGroup: [rule1, rule3] },
    { ruleGroup: [rule1, rule3, rule5], expectedRuleGroup: [rule1, rule3, rule5] },
    { ruleGroup: [rule5, rule3, rule1], expectedRuleGroup: [rule1, rule3, rule5] },
  ])(
    'case %#',
    ({
      ruleGroup,
      expectedRuleGroup,
    }: {
      ruleGroup: TestRuleJustComplexity[];
      expectedRuleGroup: TestRuleJustComplexity[];
    }) => {
      const resultGroup = sortGroupByComplexity(ruleGroup);
      expect(resultGroup).toStrictEqual(expectedRuleGroup);
    }
  );
});

type TestRule = { id: number; resultType: RuleEvaluationResultType; complexity: RuleComplexity };

describe(reorderRulesByRuleComplexityGroups, () => {
  const rule1 = {
    id: 1,
    resultType: RuleEvaluationResultType.ALLOW_OR_SKIP,
    complexity: RuleComplexity.LARGE_ASYNC,
  };
  const rule2 = {
    id: 2,
    resultType: RuleEvaluationResultType.ALLOW_OR_SKIP,
    complexity: RuleComplexity.CONSTANT_TIME,
  };
  const rule3 = {
    id: 3,
    resultType: RuleEvaluationResultType.SKIP,
    complexity: RuleComplexity.CONSTANT_TIME,
  };
  const rule4 = {
    id: 4,
    resultType: RuleEvaluationResultType.SKIP,
    complexity: RuleComplexity.LARGE_ASYNC,
  };
  const rule5 = {
    id: 5,
    resultType: RuleEvaluationResultType.DENY_OR_SKIP,
    complexity: RuleComplexity.SMALL_ASYNC,
  };
  const rule6 = {
    id: 6,
    resultType: RuleEvaluationResultType.DENY_OR_SKIP,
    complexity: RuleComplexity.CONSTANT_TIME,
  };

  test.each([
    {
      ruleset: [rule1, rule2, rule3, rule4, rule5, rule6],
      expectedRuleset: [rule2, rule3, rule1, rule4, rule6, rule5],
    },
  ])(
    'case %#',
    ({ ruleset, expectedRuleset }: { ruleset: TestRule[]; expectedRuleset: TestRule[] }) => {
      const resultRuleset = reorderRulesByRuleComplexityGroups(ruleset);
      expect(resultRuleset).toStrictEqual(expectedRuleset);
    }
  );
});

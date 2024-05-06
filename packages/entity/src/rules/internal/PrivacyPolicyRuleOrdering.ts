import invariant from 'invariant';

import { RuleComplexity, RuleEvaluationResultType } from '../PrivacyPolicyRuleEnums';

/**
 * Privacy policy list of PrivacyPolicyRule can be reordered safely according to
 * the following constraints on RuleEvaluationResultType:
 * 1. Two adjacent ALLOW_OR_SKIP rules can be swapped.
 * 2. Two adjacent DENY_OR_SKIP rules can be swapped.
 * 3. SKIP rules can be swapped with any other adjacent rule.
 *
 * @param rulesetOriginalOrder - ruleset with original ordering defined in code
 * @returns reordered ruleset depending on constraints above
 */
export function reorderRulesByRuleComplexityGroups<
  TRule extends { resultType: RuleEvaluationResultType; complexity: RuleComplexity }
>(rulesetOriginalOrder: readonly TRule[]): readonly TRule[] {
  // first, group the rules according to constraints
  const groups = groupRulesByResultType(rulesetOriginalOrder);

  // sort the groups by declared complexity
  const internallySortedGroups = groups.map((group) => sortGroupByComplexity(group));

  // flatten the groups
  return internallySortedGroups.flat();
}

export function sortGroupByComplexity<TRule extends { complexity: RuleComplexity }>(
  ruleGroup: readonly TRule[]
): readonly TRule[] {
  return [...ruleGroup].sort((a, b) => a.complexity - b.complexity);
}

export function groupRulesByResultType<TRule extends { resultType: RuleEvaluationResultType }>(
  ruleset: readonly TRule[]
): readonly (readonly TRule[])[] {
  const groups: TRule[][] = [[]];
  let currentGroupIdx = 0;
  let currentGroupType:
    | RuleEvaluationResultType.ALLOW_OR_SKIP
    | RuleEvaluationResultType.DENY_OR_SKIP
    | null = null;

  for (const rule of ruleset) {
    // if group type of this rule is not compatible with the current group type, start a new group
    if (
      currentGroupType !== null &&
      rule.resultType !== currentGroupType &&
      rule.resultType !== RuleEvaluationResultType.SKIP
    ) {
      currentGroupIdx += 1;
      groups.push([]);
      currentGroupType = null;
    }

    // add the current rule to the current group
    const currentGroup = groups[currentGroupIdx];
    invariant(currentGroup, `invalid groups index ${currentGroupIdx}`);
    currentGroup.push(rule);

    // if there isn't a known group type yet for the current group, set it to the group type of the rule.
    // note that if there isn't a known group type yet and the current rule is SKIP, we'll
    // continue to the next rule to determine group type
    if (currentGroupType === null && rule.resultType !== RuleEvaluationResultType.SKIP) {
      currentGroupType = rule.resultType;
    }
  }

  return groups;
}

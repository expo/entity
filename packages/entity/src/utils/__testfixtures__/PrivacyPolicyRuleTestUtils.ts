import { describe, expect, test } from '@jest/globals';

import type { EntityPrivacyPolicyRuleEvaluationContext } from '../../EntityPrivacyPolicy.ts';
import type { EntityQueryContext } from '../../EntityQueryContext.ts';
import type { ReadonlyEntity } from '../../ReadonlyEntity.ts';
import type { ViewerContext } from '../../ViewerContext.ts';
import type { PrivacyPolicyRule } from '../../rules/PrivacyPolicyRule.ts';
import {
  RuleEvaluationResult,
  normalizeRuleEvaluationOutcome,
} from '../../rules/PrivacyPolicyRule.ts';

export interface Case<
  TFields extends Record<string, any>,
  TIDField extends keyof NonNullable<Pick<TFields, TSelectedFields>>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TIDField, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields,
> {
  viewerContext: TViewerContext;
  queryContext: EntityQueryContext;
  evaluationContext: EntityPrivacyPolicyRuleEvaluationContext<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TSelectedFields
  >;
  entity: TEntity;
  /**
   * For skip and deny cases: the exact reason codes the rule must attach to its result, in order.
   * Omit to assert only the result. An empty array asserts that no reasons were attached.
   * Ignored for allow cases.
   */
  expectedReasons?: readonly string[];
}

export type CaseMap<
  TFields extends Record<string, any>,
  TIDField extends keyof NonNullable<Pick<TFields, TSelectedFields>>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TIDField, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields,
> = Map<string, () => Promise<Case<TFields, TIDField, TViewerContext, TEntity, TSelectedFields>>>;

/**
 * Useful for defining test cases that have async preconditions.
 */
export const describePrivacyPolicyRuleWithAsyncTestCase = <
  TFields extends Record<string, any>,
  TIDField extends keyof NonNullable<Pick<TFields, TSelectedFields>>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TIDField, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields,
>(
  privacyPolicyRule: PrivacyPolicyRule<TFields, TIDField, TViewerContext, TEntity, TSelectedFields>,
  {
    allowCases = new Map(),
    skipCases = new Map(),
    denyCases = new Map(),
  }: {
    allowCases?: CaseMap<TFields, TIDField, TViewerContext, TEntity, TSelectedFields>;
    skipCases?: CaseMap<TFields, TIDField, TViewerContext, TEntity, TSelectedFields>;
    denyCases?: CaseMap<TFields, TIDField, TViewerContext, TEntity, TSelectedFields>;
  },
): void => {
  describe(privacyPolicyRule.constructor.name, () => {
    if (allowCases && allowCases.size > 0) {
      describe('allow cases', () => {
        test.each(Array.from(allowCases.keys()))('%p', async (caseKey) => {
          const { viewerContext, queryContext, evaluationContext, entity } =
            await allowCases.get(caseKey)!();
          const outcome = await privacyPolicyRule.evaluateAsync(
            viewerContext,
            queryContext,
            evaluationContext,
            entity,
          );
          expect(normalizeRuleEvaluationOutcome(outcome).result).toEqual(
            RuleEvaluationResult.ALLOW,
          );
        });
      });
    }

    if (skipCases && skipCases.size > 0) {
      describe('skip cases', () => {
        test.each(Array.from(skipCases.keys()))('%p', async (caseKey) => {
          const { viewerContext, queryContext, evaluationContext, entity, expectedReasons } =
            await skipCases.get(caseKey)!();
          const outcome = normalizeRuleEvaluationOutcome(
            await privacyPolicyRule.evaluateAsync(
              viewerContext,
              queryContext,
              evaluationContext,
              entity,
            ),
          );
          expect(outcome.result).toEqual(RuleEvaluationResult.SKIP);
          if (expectedReasons !== undefined) {
            expect(outcome.reasons).toEqual(expectedReasons);
          }
        });
      });
    }

    if (denyCases && denyCases.size > 0) {
      describe('deny cases', () => {
        test.each(Array.from(denyCases.keys()))('%p', async (caseKey) => {
          const { viewerContext, queryContext, evaluationContext, entity, expectedReasons } =
            await denyCases.get(caseKey)!();
          const outcome = normalizeRuleEvaluationOutcome(
            await privacyPolicyRule.evaluateAsync(
              viewerContext,
              queryContext,
              evaluationContext,
              entity,
            ),
          );
          expect(outcome.result).toEqual(RuleEvaluationResult.DENY);
          if (expectedReasons !== undefined) {
            expect(outcome.reasons).toEqual(expectedReasons);
          }
        });
      });
    }
  });
};

/**
 * For test simple privacy rules that don't have complex async preconditions.
 */
export const describePrivacyPolicyRule = <
  TFields extends Record<string, any>,
  TIDField extends keyof NonNullable<Pick<TFields, TSelectedFields>>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TIDField, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields,
>(
  privacyPolicyRule: PrivacyPolicyRule<TFields, TIDField, TViewerContext, TEntity, TSelectedFields>,
  {
    allowCases = [],
    skipCases = [],
    denyCases = [],
  }: {
    allowCases?: Case<TFields, TIDField, TViewerContext, TEntity, TSelectedFields>[];
    skipCases?: Case<TFields, TIDField, TViewerContext, TEntity, TSelectedFields>[];
    denyCases?: Case<TFields, TIDField, TViewerContext, TEntity, TSelectedFields>[];
  },
): void => {
  const makeCasesMap = (
    cases: Case<TFields, TIDField, TViewerContext, TEntity, TSelectedFields>[],
  ): CaseMap<TFields, TIDField, TViewerContext, TEntity, TSelectedFields> =>
    cases.reduce(
      (
        acc: CaseMap<TFields, TIDField, TViewerContext, TEntity, TSelectedFields>,
        testCase: Case<TFields, TIDField, TViewerContext, TEntity, TSelectedFields>,
        index,
      ) => {
        acc.set(`case ${index}`, async () => testCase);
        return acc;
      },
      new Map(),
    );

  describePrivacyPolicyRuleWithAsyncTestCase(privacyPolicyRule, {
    allowCases: makeCasesMap(allowCases),
    skipCases: makeCasesMap(skipCases),
    denyCases: makeCasesMap(denyCases),
  });
};

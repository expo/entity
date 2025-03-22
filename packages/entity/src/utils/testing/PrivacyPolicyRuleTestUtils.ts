import { EntityPrivacyPolicyEvaluationContext } from '../../EntityPrivacyPolicy';
import { EntityQueryContext } from '../../EntityQueryContext';
import ReadonlyEntity from '../../ReadonlyEntity';
import ViewerContext from '../../ViewerContext';
import PrivacyPolicyRule, { RuleEvaluationResult } from '../../rules/PrivacyPolicyRule';

export interface Case<
  TFields extends Record<string, any>,
  TID extends NonNullable<TFields[TSelectedFields]>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields,
> {
  viewerContext: TViewerContext;
  queryContext: EntityQueryContext;
  evaluationContext: EntityPrivacyPolicyEvaluationContext<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TSelectedFields
  >;
  entity: TEntity;
}

export type CaseMap<
  TFields extends Record<string, any>,
  TID extends NonNullable<TFields[TSelectedFields]>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields,
> = Map<string, () => Promise<Case<TFields, TID, TViewerContext, TEntity, TSelectedFields>>>;

/**
 * Useful for defining test cases that have async preconditions.
 */
export const describePrivacyPolicyRuleWithAsyncTestCase = <
  TFields extends Record<string, any>,
  TID extends NonNullable<TFields[TSelectedFields]>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields,
>(
  privacyPolicyRule: PrivacyPolicyRule<TFields, TID, TViewerContext, TEntity, TSelectedFields>,
  {
    allowCases = new Map(),
    skipCases = new Map(),
    denyCases = new Map(),
  }: {
    allowCases?: CaseMap<TFields, TID, TViewerContext, TEntity, TSelectedFields>;
    skipCases?: CaseMap<TFields, TID, TViewerContext, TEntity, TSelectedFields>;
    denyCases?: CaseMap<TFields, TID, TViewerContext, TEntity, TSelectedFields>;
  },
): void => {
  describe(privacyPolicyRule.constructor.name, () => {
    if (allowCases && allowCases.size > 0) {
      describe('allow cases', () => {
        test.each(Array.from(allowCases.keys()))('%p', async (caseKey) => {
          const { viewerContext, queryContext, evaluationContext, entity } =
            await allowCases.get(caseKey)!();
          await expect(
            privacyPolicyRule.evaluateAsync(viewerContext, queryContext, evaluationContext, entity),
          ).resolves.toEqual(RuleEvaluationResult.ALLOW);
        });
      });
    }

    if (skipCases && skipCases.size > 0) {
      describe('skip cases', () => {
        test.each(Array.from(skipCases.keys()))('%p', async (caseKey) => {
          const { viewerContext, queryContext, evaluationContext, entity } =
            await skipCases.get(caseKey)!();
          await expect(
            privacyPolicyRule.evaluateAsync(viewerContext, queryContext, evaluationContext, entity),
          ).resolves.toEqual(RuleEvaluationResult.SKIP);
        });
      });
    }

    if (denyCases && denyCases.size > 0) {
      describe('deny cases', () => {
        test.each(Array.from(denyCases.keys()))('%p', async (caseKey) => {
          const { viewerContext, queryContext, evaluationContext, entity } =
            await denyCases.get(caseKey)!();
          await expect(
            privacyPolicyRule.evaluateAsync(viewerContext, queryContext, evaluationContext, entity),
          ).resolves.toEqual(RuleEvaluationResult.DENY);
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
  TID extends NonNullable<TFields[TSelectedFields]>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields,
>(
  privacyPolicyRule: PrivacyPolicyRule<TFields, TID, TViewerContext, TEntity, TSelectedFields>,
  {
    allowCases = [],
    skipCases = [],
    denyCases = [],
  }: {
    allowCases?: Case<TFields, TID, TViewerContext, TEntity, TSelectedFields>[];
    skipCases?: Case<TFields, TID, TViewerContext, TEntity, TSelectedFields>[];
    denyCases?: Case<TFields, TID, TViewerContext, TEntity, TSelectedFields>[];
  },
): void => {
  const makeCasesMap = (
    cases: Case<TFields, TID, TViewerContext, TEntity, TSelectedFields>[],
  ): CaseMap<TFields, TID, TViewerContext, TEntity, TSelectedFields> =>
    cases.reduce(
      (
        acc: CaseMap<TFields, TID, TViewerContext, TEntity, TSelectedFields>,
        testCase: Case<TFields, TID, TViewerContext, TEntity, TSelectedFields>,
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

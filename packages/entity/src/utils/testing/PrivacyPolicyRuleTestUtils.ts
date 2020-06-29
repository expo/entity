import { EntityQueryContext } from '../../EntityQueryContext';
import ReadonlyEntity from '../../ReadonlyEntity';
import ViewerContext from '../../ViewerContext';
import PrivacyPolicyRule, { RuleEvaluationResult } from '../../rules/PrivacyPolicyRule';

export interface Case<
  TFields,
  TID,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TDatabaseFields>,
  TDatabaseFields extends TFields = TFields
> {
  viewerContext: TViewerContext;
  queryContext: EntityQueryContext;
  entity: TEntity;
}

type CaseMap<
  TFields,
  TID,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TDatabaseFields>,
  TDatabaseFields extends TFields = TFields
> = Map<string, () => Promise<Case<TFields, TID, TViewerContext, TEntity, TDatabaseFields>>>;

/**
 * Useful for defining test cases that have async preconditions.
 */
export const describePrivacyPolicyRuleWithAsyncTestCase = <
  TFields,
  TID,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TDatabaseFields>,
  TDatabaseFields extends TFields = TFields
>(
  privacyPolicyRule: PrivacyPolicyRule<TFields, TID, TViewerContext, TEntity, TDatabaseFields>,
  {
    allowCases = new Map(),
    skipCases = new Map(),
    denyCases = new Map(),
  }: {
    allowCases?: CaseMap<TFields, TID, TViewerContext, TEntity, TDatabaseFields>;
    skipCases?: CaseMap<TFields, TID, TViewerContext, TEntity, TDatabaseFields>;
    denyCases?: CaseMap<TFields, TID, TViewerContext, TEntity, TDatabaseFields>;
  }
): void => {
  describe(privacyPolicyRule.constructor.name, () => {
    if (allowCases && allowCases.size > 0) {
      describe('allow cases', () => {
        test.each(Array.from(allowCases.keys()))('%p', async (caseKey) => {
          const { viewerContext, queryContext, entity } = await allowCases.get(caseKey)!();
          await expect(
            privacyPolicyRule.evaluateAsync(viewerContext, queryContext, entity)
          ).resolves.toEqual(RuleEvaluationResult.ALLOW);
        });
      });
    }

    if (skipCases && skipCases.size > 0) {
      describe('skip cases', () => {
        test.each(Array.from(skipCases.keys()))('%p', async (caseKey) => {
          const { viewerContext, queryContext, entity } = await skipCases.get(caseKey)!();
          await expect(
            privacyPolicyRule.evaluateAsync(viewerContext, queryContext, entity)
          ).resolves.toEqual(RuleEvaluationResult.SKIP);
        });
      });
    }

    if (denyCases && denyCases.size > 0) {
      describe('deny cases', () => {
        test.each(Array.from(denyCases.keys()))('%p', async (caseKey) => {
          const { viewerContext, queryContext, entity } = await denyCases.get(caseKey)!();
          await expect(
            privacyPolicyRule.evaluateAsync(viewerContext, queryContext, entity)
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
  TFields,
  TID,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TDatabaseFields>,
  TDatabaseFields extends TFields = TFields
>(
  privacyPolicyRule: PrivacyPolicyRule<TFields, TID, TViewerContext, TEntity, TDatabaseFields>,
  {
    allowCases = [],
    skipCases = [],
    denyCases = [],
  }: {
    allowCases?: Case<TFields, TID, TViewerContext, TEntity, TDatabaseFields>[];
    skipCases?: Case<TFields, TID, TViewerContext, TEntity, TDatabaseFields>[];
    denyCases?: Case<TFields, TID, TViewerContext, TEntity, TDatabaseFields>[];
  }
): void => {
  const makeCasesMap = (
    cases: Case<TFields, TID, TViewerContext, TEntity, TDatabaseFields>[]
  ): CaseMap<TFields, TID, TViewerContext, TEntity, TDatabaseFields> =>
    cases.reduce(
      (
        acc: CaseMap<TFields, TID, TViewerContext, TEntity, TDatabaseFields>,
        testCase: Case<TFields, TID, TViewerContext, TEntity, TDatabaseFields>,
        index
      ) => {
        acc.set(`case ${index}`, async () => testCase);
        return acc;
      },
      new Map()
    );

  return describePrivacyPolicyRuleWithAsyncTestCase(privacyPolicyRule, {
    allowCases: makeCasesMap(allowCases),
    skipCases: makeCasesMap(skipCases),
    denyCases: makeCasesMap(denyCases),
  });
};

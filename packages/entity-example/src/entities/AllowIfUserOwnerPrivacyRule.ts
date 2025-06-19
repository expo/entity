import {
  type EntityPrivacyPolicyEvaluationContext,
  EntityQueryContext,
  PrivacyPolicyRule,
  ReadonlyEntity,
  RuleEvaluationResult,
} from '@expo/entity';

import { ExampleViewerContext } from '../viewerContexts.ts';

/**
 * Example privacy rule that makes use of the types of ViewerContexts specific
 * to this application.
 *
 * For simplicity, all privacy rules should generally be of the form
 * - AllowIfConditionPrivacy rule - allows when condition holds, otherwise skips
 * - DenyIfConditionPrivacy rule - denies when condition holds, otherwise skips
 *
 * If all rules skip, the privacy policy itself denies access.
 *
 * This particular rule checks the owner field of the entity being authorized
 * and compares it to the current viewer's user ID. If they're the same, it allows.
 * Otherwise, it defers to the next rule in the policy.
 */
export class AllowIfUserOwnerPrivacyRule<
  TFields extends Record<string, any>,
  TIDField extends keyof NonNullable<Pick<TFields, TSelectedFields>>,
  TEntity extends ReadonlyEntity<TFields, TIDField, ExampleViewerContext>,
  TSelectedFields extends keyof TFields = keyof TFields,
> extends PrivacyPolicyRule<TFields, TIDField, ExampleViewerContext, TEntity> {
  constructor(private readonly entityOwnerField: keyof TFields) {
    super();
  }

  async evaluateAsync(
    viewerContext: ExampleViewerContext,
    _queryContext: EntityQueryContext,
    _evaluationContext: EntityPrivacyPolicyEvaluationContext<
      TFields,
      TIDField,
      ExampleViewerContext,
      TEntity,
      TSelectedFields
    >,
    entity: TEntity,
  ): Promise<RuleEvaluationResult> {
    if (viewerContext.isUserViewerContext()) {
      if (String(entity.getField(this.entityOwnerField)) === viewerContext.userID) {
        return RuleEvaluationResult.ALLOW;
      }
    }

    return RuleEvaluationResult.SKIP;
  }
}

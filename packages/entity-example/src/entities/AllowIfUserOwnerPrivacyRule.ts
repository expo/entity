import {
  PrivacyPolicyRule,
  ReadonlyEntity,
  EntityQueryContext,
  RuleEvaluationResult,
} from '@expo/entity';

import { ExampleViewerContext } from '../viewerContexts';

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
export default class AllowIfUserOwnerPrivacyRule<
  TFields,
  TID extends NonNullable<TFields[TSelectedFields]>,
  TEntity extends ReadonlyEntity<TFields, TID, ExampleViewerContext>,
  TSelectedFields extends keyof TFields = keyof TFields
> extends PrivacyPolicyRule<TFields, TID, ExampleViewerContext, TEntity> {
  constructor(private readonly entityOwnerField: keyof TFields) {
    super();
  }

  async evaluateAsync(
    viewerContext: ExampleViewerContext,
    _queryContext: EntityQueryContext,
    entity: TEntity
  ): Promise<RuleEvaluationResult> {
    if (viewerContext.isUserViewerContext()) {
      if (String(entity.getField(this.entityOwnerField)) === viewerContext.userID) {
        return RuleEvaluationResult.ALLOW;
      }
    }

    return RuleEvaluationResult.SKIP;
  }
}

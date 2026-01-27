import { IEntityClass } from '../Entity';
import { EntityPrivacyPolicy, EntityPrivacyPolicyEvaluationContext } from '../EntityPrivacyPolicy';
import { EntityQueryContext } from '../EntityQueryContext';
import { ReadonlyEntity } from '../ReadonlyEntity';
import { ViewerContext } from '../ViewerContext';
import { PrivacyPolicyRule, RuleEvaluationResult } from './PrivacyPolicyRule';

/**
 * Directive for specifying the parent relationship in AllowIfInParentCascadeDeletionPrivacyPolicyRule.
 */
export interface AllowIfInParentCascadeDeletionDirective<
  TViewerContext extends ViewerContext,
  TFields,
  TParentFields extends object,
  TParentIDField extends keyof NonNullable<Pick<TParentFields, TParentSelectedFields>>,
  TParentEntity extends ReadonlyEntity<
    TParentFields,
    TParentIDField,
    TViewerContext,
    TParentSelectedFields
  >,
  TParentPrivacyPolicy extends EntityPrivacyPolicy<
    TParentFields,
    TParentIDField,
    TViewerContext,
    TParentEntity,
    TParentSelectedFields
  >,
  TSelectedFields extends keyof TFields = keyof TFields,
  TParentSelectedFields extends keyof TParentFields = keyof TParentFields,
> {
  /**
   * Class of parent entity that should trigger a cascade set null update to a field within
   * the entity being authorized.
   */
  parentEntityClass: IEntityClass<
    TParentFields,
    TParentIDField,
    TViewerContext,
    TParentEntity,
    TParentPrivacyPolicy,
    TParentSelectedFields
  >;

  /**
   * Field of the current entity with references the deleting instace of parentEntityClass.
   */
  fieldIdentifyingParentEntity: keyof Pick<TFields, TSelectedFields>;

  /**
   * Field in parentEntityClass referenced by the value of fieldIdentifyingParentEntity.
   * If not provided, ID is assumed.
   */
  parentEntityLookupByField?: keyof Pick<TParentFields, TParentSelectedFields>;
}

/**
 * A generic privacy policy rule that allows when an entity is being authorized
 * as part of a cascading delete from a parent entity. Handles two cases:
 * - When the field has not yet been null'ed out due to a cascading set null. This is often
 *   required for read rules to authorize the initial re-read of the entity being update set null'ed.
 * - When the field has been null'ed out due to a cascading set null. This is often required
 *   the update rules for the field nullification.
 *
 * These two cases could theoretically be handled by two separate (stricter) rules, but are combined
 * to simplify configuration since practically there are few cases where having them be combined would
 * preset an issue.
 *
 * @example
 * Billing info owned by an account, but records who created the billing info in creating_user_id. User is a member of that account.
 * User can delete themselves, and the billing info's creating_user_id field is cascade set null'ed when the user is deleted.
 *
 * ```ts
 *  class BillingInfoEntityPrivacyPolicy extends EntityPrivacyPolicy<...> {
 *    protected override readonly readRules = [
 *      ...,
 *      new AllowIfInParentCascadeDeletionPrivacyPolicyRule<...>({
 *        fieldIdentifyingParentEntity: 'creating_user_id',
 *        parentEntityClass: UserEntity,
 *      }),
 *    ];
 *
 *    protected override readonly updateRules = [
 *      ...,
 *      new AllowIfInParentCascadeDeletionPrivacyPolicyRule<...>({
 *        fieldIdentifyingParentEntity: 'creating_user_id',
 *        parentEntityClass: UserEntity,
 *      }),
 *    ];
 *  }
 * ```
 */
export class AllowIfInParentCascadeDeletionPrivacyPolicyRule<
  TFields extends object,
  TIDField extends keyof NonNullable<Pick<TFields, TSelectedFields>>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TIDField, TViewerContext, TSelectedFields>,
  TFields2 extends object,
  TIDField2 extends keyof NonNullable<Pick<TFields2, TSelectedFields2>>,
  TEntity2 extends ReadonlyEntity<TFields2, TIDField2, TViewerContext, TSelectedFields2>,
  TPrivacyPolicy2 extends EntityPrivacyPolicy<
    TFields2,
    TIDField2,
    TViewerContext,
    TEntity2,
    TSelectedFields2
  >,
  TSelectedFields extends keyof TFields = keyof TFields,
  TSelectedFields2 extends keyof TFields2 = keyof TFields2,
> extends PrivacyPolicyRule<TFields, TIDField, TViewerContext, TEntity, TSelectedFields> {
  constructor(
    private readonly directive: AllowIfInParentCascadeDeletionDirective<
      TViewerContext,
      TFields,
      TFields2,
      TIDField2,
      TEntity2,
      TPrivacyPolicy2,
      TSelectedFields,
      TSelectedFields2
    >,
  ) {
    super();
  }

  async evaluateAsync(
    _viewerContext: TViewerContext,
    _queryContext: EntityQueryContext,
    evaluationContext: EntityPrivacyPolicyEvaluationContext<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
    entity: TEntity,
  ): Promise<RuleEvaluationResult> {
    const parentEntityClass = this.directive.parentEntityClass;

    const deleteCause = evaluationContext.cascadingDeleteCause;
    if (!deleteCause || !(deleteCause.entity instanceof parentEntityClass)) {
      return RuleEvaluationResult.SKIP;
    }

    const entityBeingDeleted = deleteCause.entity;

    // allow if parent foreign key field matches specified field in the entity being authorized
    const valueInThisEntityReferencingParent = entity.getField(
      this.directive.fieldIdentifyingParentEntity,
    );
    const valueInParent = this.directive.parentEntityLookupByField
      ? entityBeingDeleted.getField(this.directive.parentEntityLookupByField)
      : entityBeingDeleted.getID();

    if (
      valueInThisEntityReferencingParent &&
      valueInThisEntityReferencingParent === valueInParent
    ) {
      return RuleEvaluationResult.ALLOW;
    }

    // allow if parent foreign key field matches specified field in the entity being authorized, and the
    // field in the entity being authorized has been null'ed out  due to cascading set null
    const valueInPreviousValueOfThisEntityReferencingParent =
      evaluationContext.previousValue?.getField(this.directive.fieldIdentifyingParentEntity);

    if (
      valueInPreviousValueOfThisEntityReferencingParent &&
      valueInPreviousValueOfThisEntityReferencingParent === valueInParent &&
      valueInThisEntityReferencingParent === null
    ) {
      return RuleEvaluationResult.ALLOW;
    }

    return RuleEvaluationResult.SKIP;
  }
}

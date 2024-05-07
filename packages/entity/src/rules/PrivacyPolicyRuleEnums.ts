/**
 * Enum return type of privacy policy rule evaluation.
 */
export enum RuleEvaluationResult {
  /**
   * Deny viewer access to the entity.
   */
  DENY = -1,

  /**
   * Defer entity viewer access to subsequent rule in the privacy policy.
   */
  SKIP = 0,

  /**
   * Allow viewer access to the entity.
   */
  ALLOW = 1,
}

/**
 * Estimated complexity of a privacy policy rule. Definition of what rules fall into what complexity category
 * is application-specific, but the AlwaysAllow/AlwaysDeny/AlwaysSkip rules provided are all defined as LOW
 * complexity.
 */
export enum RuleComplexity {
  /**
   * Rule complexity is low. Definition dependent on application.
   */
  LOW = 0,

  /**
   * Rule complexity is medium. Definition dependent on application.
   */
  MEDIUM = 1,

  /**
   * Rule complexity is high. Definition dependent on application.
   */
  HIGH = 2,
}

/**
 * Used for disambiguation between classes of privacy policy rules at runtime.
 * Multiple rules of the same type in a row can be reordered safely to improve policy evaluation time
 * based on complexities.
 */
export enum RuleEvaluationResultType {
  /**
   * Rule is a DenyOrSkipPrivacyPolicyRule. Can be safely reordered with other sequential DenyOrSkipPrivacyPolicyRule or SkipPrivacyPolicyRule in a policy.
   */
  DENY_OR_SKIP,
  /**
   * Rule is a SkipPrivacyPolicyRule. Can be safely reordered with any other sequential privacy policy rules in a policy.
   */
  SKIP,
  /**
   * Rule is an AllowOrSkipPrivacyPolicyRule. Can be safely reordered with other sequential AllowOrSkipPrivacyPolicyRule or SkipPrivacyPolicyRule in a policy.
   */
  ALLOW_OR_SKIP,
}

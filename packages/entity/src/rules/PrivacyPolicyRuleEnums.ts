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
 * Estimated complexity of a privacy policy rule.
 */
export enum RuleComplexity {
  /**
   * Rule doesn't make any async calls.
   */
  CONSTANT_TIME = 0,

  /**
   * Rule makes an small amount of async calls. Definition of small dependent on application.
   */
  SMALL_ASYNC = 1,

  /**
   * Rule makes a large amount of async calls. Definition of large dependent on application.
   */
  LARGE_ASYNC = 2,
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

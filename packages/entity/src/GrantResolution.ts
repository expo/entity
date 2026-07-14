/**
 * A small, pure helper for resolving whether a subject holds a required permission over a
 * resource that lives in a containment hierarchy (e.g. resource -> parent -> root).
 *
 * It is intentionally dependency-free and total: the caller supplies the already-gathered
 * data (the resource's ancestry, the permissions the subject holds keyed by resource, and
 * whether the target resource opts out of inheritance for this permission), and this function
 * applies the resolution rule. Keeping the rule separate from data gathering makes it trivial
 * to unit-test and reuse across different storage/permission models.
 */

export interface GrantResolutionInput {
  /**
   * Resource keys ordered from the target resource up to the root ancestor,
   * e.g. ['document:<id>', 'folder:<id>', 'root:<id>']. Index 0 is the target being accessed.
   */
  readonly ancestryResourceKeys: readonly string[];

  /**
   * Whether the target resource (ancestryResourceKeys[0]) opts out of inheritance for the
   * required permission. When true, only a permission held directly on the target satisfies;
   * permissions inherited from ancestors do not.
   */
  readonly targetInheritanceDisabledForRequiredPermission: boolean;

  /**
   * The permissions the subject holds on each resource key, already expanded through any
   * implication closure. resourceKey -> set of permission names.
   */
  readonly heldPermissionsByResourceKey: ReadonlyMap<string, ReadonlySet<string>>;

  /** The permission the action requires. */
  readonly requiredPermission: string;
}

/**
 * Returns true iff the subject holds the required permission on the target or, unless
 * inheritance is disabled for the target, any of its ancestors.
 *
 * Pure, total, and deterministic: no I/O, no throwing.
 */
export function resolveGrantDecision(input: GrantResolutionInput): boolean {
  const {
    ancestryResourceKeys,
    targetInheritanceDisabledForRequiredPermission,
    heldPermissionsByResourceKey,
    requiredPermission,
  } = input;

  if (ancestryResourceKeys.length === 0) {
    return false;
  }

  const matchKeys = targetInheritanceDisabledForRequiredPermission
    ? ancestryResourceKeys.slice(0, 1) // target only, inheritance disabled
    : ancestryResourceKeys; // target and its ancestors

  for (const resourceKey of matchKeys) {
    const held = heldPermissionsByResourceKey.get(resourceKey);
    if (held !== undefined && held.has(requiredPermission)) {
      return true;
    }
  }

  return false;
}

import { describe, expect, it } from '@jest/globals';

import { resolveGrantDecision } from '../GrantResolution.ts';

describe(resolveGrantDecision, () => {
  const ancestry = ['document:d', 'folder:f', 'root:r'];

  it('denies when the subject holds no permissions', () => {
    expect(
      resolveGrantDecision({
        ancestryResourceKeys: ancestry,
        targetInheritanceDisabledForRequiredPermission: false,
        heldPermissionsByResourceKey: new Map(),
        requiredPermission: 'write',
      })
    ).toBe(false);
  });

  it('allows a permission held directly on the target', () => {
    expect(
      resolveGrantDecision({
        ancestryResourceKeys: ancestry,
        targetInheritanceDisabledForRequiredPermission: false,
        heldPermissionsByResourceKey: new Map([['document:d', new Set(['write'])]]),
        requiredPermission: 'write',
      })
    ).toBe(true);
  });

  it('allows a permission inherited from an ancestor', () => {
    expect(
      resolveGrantDecision({
        ancestryResourceKeys: ancestry,
        targetInheritanceDisabledForRequiredPermission: false,
        heldPermissionsByResourceKey: new Map([['root:r', new Set(['write'])]]),
        requiredPermission: 'write',
      })
    ).toBe(true);
  });

  it('does not match a different permission', () => {
    expect(
      resolveGrantDecision({
        ancestryResourceKeys: ancestry,
        targetInheritanceDisabledForRequiredPermission: false,
        heldPermissionsByResourceKey: new Map([['root:r', new Set(['read'])]]),
        requiredPermission: 'write',
      })
    ).toBe(false);
  });

  describe('when inheritance is disabled for the target', () => {
    it('ignores permissions inherited from ancestors', () => {
      expect(
        resolveGrantDecision({
          ancestryResourceKeys: ancestry,
          targetInheritanceDisabledForRequiredPermission: true,
          heldPermissionsByResourceKey: new Map([
            ['folder:f', new Set(['write'])],
            ['root:r', new Set(['write'])],
          ]),
          requiredPermission: 'write',
        })
      ).toBe(false);
    });

    it('still honors a permission held directly on the target', () => {
      expect(
        resolveGrantDecision({
          ancestryResourceKeys: ancestry,
          targetInheritanceDisabledForRequiredPermission: true,
          heldPermissionsByResourceKey: new Map([['document:d', new Set(['write'])]]),
          requiredPermission: 'write',
        })
      ).toBe(true);
    });
  });

  it('denies when the ancestry is empty', () => {
    expect(
      resolveGrantDecision({
        ancestryResourceKeys: [],
        targetInheritanceDisabledForRequiredPermission: false,
        heldPermissionsByResourceKey: new Map([['document:d', new Set(['write'])]]),
        requiredPermission: 'write',
      })
    ).toBe(false);
  });
});

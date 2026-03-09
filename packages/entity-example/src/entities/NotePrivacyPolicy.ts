import { AlwaysAllowPrivacyPolicyRule, EntityPrivacyPolicy } from '@expo/entity';

import type { ExampleViewerContext } from '../viewerContexts.ts';
import { AllowIfUserOwnerPrivacyRule } from './AllowIfUserOwnerPrivacyRule.ts';
import type { NoteEntity, NoteFields } from './NoteEntity.ts';

/**
 * For purposes of this demonstration, notes are considered public and can only be mutated by the owner.
 */
export class NotePrivacyPolicy extends EntityPrivacyPolicy<
  NoteFields,
  'id',
  ExampleViewerContext,
  NoteEntity
> {
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<NoteFields, 'id', ExampleViewerContext, NoteEntity>(),
  ];
  protected override readonly createRules = [
    new AllowIfUserOwnerPrivacyRule<NoteFields, 'id', NoteEntity>('userID'),
  ];
  protected override readonly updateRules = [
    new AllowIfUserOwnerPrivacyRule<NoteFields, 'id', NoteEntity>('userID'),
  ];
  protected override readonly deleteRules = [
    new AllowIfUserOwnerPrivacyRule<NoteFields, 'id', NoteEntity>('userID'),
  ];
}

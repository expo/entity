import { EntityPrivacyPolicy, AlwaysAllowPrivacyPolicyRule } from '@expo/entity';

import AllowIfUserOwnerPrivacyRule from './AllowIfUserOwnerPrivacyRule';
import NoteEntity, { NoteFields } from './NoteEntity';
import { ExampleViewerContext } from '../viewerContexts';

/**
 * For purposes of this demonstration, notes are considered public and can only be mutated by the owner.
 */
export default class NotePrivacyPolicy extends EntityPrivacyPolicy<
  NoteFields,
  string,
  ExampleViewerContext,
  NoteEntity
> {
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<NoteFields, string, ExampleViewerContext, NoteEntity>(),
  ];
  protected override readonly createRules = [
    new AllowIfUserOwnerPrivacyRule<NoteFields, string, NoteEntity>('userID'),
  ];
  protected override readonly updateRules = [
    new AllowIfUserOwnerPrivacyRule<NoteFields, string, NoteEntity>('userID'),
  ];
  protected override readonly deleteRules = [
    new AllowIfUserOwnerPrivacyRule<NoteFields, string, NoteEntity>('userID'),
  ];
}

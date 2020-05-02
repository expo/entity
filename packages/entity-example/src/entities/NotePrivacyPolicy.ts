import { EntityPrivacyPolicy, AlwaysAllowPrivacyPolicyRule } from '@expo/entity';

import { ExampleViewerContext } from '../viewerContexts';
import AllowIfUserOwnerPrivacyRule from './AllowIfUserOwnerPrivacyRule';
import NoteEntity, { NoteFields } from './NoteEntity';

/**
 * For purposes of this demonstration, notes are considered public and can only be mutated by the owner.
 */
export default class NotePrivacyPolicy extends EntityPrivacyPolicy<
  NoteFields,
  string,
  ExampleViewerContext,
  NoteEntity
> {
  protected readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<NoteFields, string, ExampleViewerContext, NoteEntity>(),
  ];
  protected readonly createRules = [
    new AllowIfUserOwnerPrivacyRule<NoteFields, string, NoteEntity>('userID'),
  ];
  protected readonly updateRules = [
    new AllowIfUserOwnerPrivacyRule<NoteFields, string, NoteEntity>('userID'),
  ];
  protected readonly deleteRules = [
    new AllowIfUserOwnerPrivacyRule<NoteFields, string, NoteEntity>('userID'),
  ];
}

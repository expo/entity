import {
  Entity,
  EntityCompanionDefinition,
  EntityConfiguration,
  UUIDField,
  DatabaseAdapterFlavor,
  CacheAdapterFlavor,
  StringField,
} from '@expo/entity';

import { ExampleViewerContext } from '../viewerContexts';
import NotePrivacyPolicy from './NotePrivacyPolicy';

export interface NoteFields {
  id: string;
  userID: string;
  title: string;
  body: string;
}

/**
 * A simple entity representing a "notes" table/collection. Each note has an owner, title, and body.
 */
export default class NoteEntity extends Entity<NoteFields, string, ExampleViewerContext> {
  static getCompanionDefinition(): EntityCompanionDefinition<
    NoteFields,
    string,
    ExampleViewerContext,
    NoteEntity,
    NotePrivacyPolicy
  > {
    return noteEntityCompanion;
  }
}

/**
 * The companion provides configuration instructions to the Entity framework for this type
 * of entity. In some languages, this would be representable as "abstract" static members
 * of the class itself, but TypeScript disallows static generic and abstract methods.
 */
export const noteEntityCompanion = {
  entityClass: NoteEntity,
  entityConfiguration: new EntityConfiguration<NoteFields>({
    idField: 'id',
    tableName: 'notes',
    schema: {
      id: new UUIDField({
        columnName: 'id',
      }),
      userID: new UUIDField({
        columnName: 'user_id',
      }),
      title: new StringField({
        columnName: 'title',
      }),
      body: new StringField({
        columnName: 'body',
      }),
    },
  }),
  databaseAdaptorFlavor: DatabaseAdapterFlavor.POSTGRES,
  cacheAdaptorFlavor: CacheAdapterFlavor.REDIS,
  privacyPolicyClass: NotePrivacyPolicy,
};

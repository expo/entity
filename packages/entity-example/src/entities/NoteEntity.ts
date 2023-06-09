import {
  Entity,
  EntityCompanionDefinition,
  EntityConfiguration,
  UUIDField,
  StringField,
} from '@expo/entity';

import NotePrivacyPolicy from './NotePrivacyPolicy';
import { ExampleViewerContext } from '../viewerContexts';

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
  /**
   * The companion provides configuration instructions to the Entity framework for this type
   * of entity. In some languages, this would be representable as "abstract" static members
   * of the class itself, but TypeScript disallows static generic and abstract methods.
   */
  static defineCompanionDefinition(): EntityCompanionDefinition<
    NoteFields,
    string,
    ExampleViewerContext,
    NoteEntity,
    NotePrivacyPolicy
  > {
    return {
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
        databaseAdapterFlavor: 'postgres',
        cacheAdapterFlavor: 'redis',
      }),
      privacyPolicyClass: NotePrivacyPolicy,
    };
  }
}

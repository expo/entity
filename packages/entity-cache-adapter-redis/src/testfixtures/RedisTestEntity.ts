import {
  AlwaysAllowPrivacyPolicyRule,
  EntityPrivacyPolicy,
  ViewerContext,
  UUIDField,
  DateField,
  StringField,
  EntityConfiguration,
  EntityCompanionDefinition,
  Entity,
} from '@expo/entity';

export type RedisTestEntityFields = {
  id: string;
  name: string;
  dateField: Date | null;
};

export default class RedisTestEntity extends Entity<RedisTestEntityFields, string, ViewerContext> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    RedisTestEntityFields,
    string,
    ViewerContext,
    RedisTestEntity,
    RedisTestEntityPrivacyPolicy
  > {
    return {
      entityClass: RedisTestEntity,
      entityConfiguration: redisTestEntityConfiguration,
      privacyPolicyClass: RedisTestEntityPrivacyPolicy,
    };
  }
}

export class RedisTestEntityPrivacyPolicy extends EntityPrivacyPolicy<
  RedisTestEntityFields,
  string,
  ViewerContext,
  RedisTestEntity
> {
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<
      RedisTestEntityFields,
      string,
      ViewerContext,
      RedisTestEntity
    >(),
  ];
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<
      RedisTestEntityFields,
      string,
      ViewerContext,
      RedisTestEntity
    >(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<
      RedisTestEntityFields,
      string,
      ViewerContext,
      RedisTestEntity
    >(),
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<
      RedisTestEntityFields,
      string,
      ViewerContext,
      RedisTestEntity
    >(),
  ];
}

export const redisTestEntityConfiguration = new EntityConfiguration<RedisTestEntityFields>({
  idField: 'id',
  tableName: 'redis_test_entities',
  schema: {
    id: new UUIDField({
      columnName: 'id',
      cache: true,
    }),
    name: new StringField({
      columnName: 'name',
      cache: true,
    }),
    dateField: new DateField({
      columnName: 'date_field',
    }),
  },
  databaseAdapterFlavor: 'postgres',
  cacheAdapterFlavor: 'redis',
});

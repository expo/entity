import {
  AlwaysAllowPrivacyPolicyRule,
  EntityPrivacyPolicy,
  ViewerContext,
  UUIDField,
  DateField,
  StringField,
  EntityConfiguration,
  DatabaseAdapterFlavor,
  CacheAdapterFlavor,
  EntityCompanionDefinition,
  Entity,
} from '@expo/entity';

export type RedisTestEntityFields = {
  id: string;
  name: string;
  dateField: Date | null;
};

export default class RedisTestEntity extends Entity<RedisTestEntityFields, string, ViewerContext> {
  static getCompanionDefinition(): EntityCompanionDefinition<
    RedisTestEntityFields,
    string,
    ViewerContext,
    RedisTestEntity,
    RedisTestEntityPrivacyPolicy
  > {
    return redisTestEntityCompanionDefinition;
  }
}

class RedisTestEntityPrivacyPolicy extends EntityPrivacyPolicy<
  RedisTestEntityFields,
  string,
  ViewerContext,
  RedisTestEntity
> {
  protected readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<
      RedisTestEntityFields,
      string,
      ViewerContext,
      RedisTestEntity
    >(),
  ];
  protected readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<
      RedisTestEntityFields,
      string,
      ViewerContext,
      RedisTestEntity
    >(),
  ];
  protected readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<
      RedisTestEntityFields,
      string,
      ViewerContext,
      RedisTestEntity
    >(),
  ];
  protected readonly deleteRules = [
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
    }),
    dateField: new DateField({
      columnName: 'date_field',
    }),
  },
  databaseAdaptorFlavor: DatabaseAdapterFlavor.POSTGRES,
  cacheAdaptorFlavor: CacheAdapterFlavor.REDIS,
});

const redisTestEntityCompanionDefinition = new EntityCompanionDefinition({
  entityClass: RedisTestEntity,
  entityConfiguration: redisTestEntityConfiguration,
  privacyPolicyClass: RedisTestEntityPrivacyPolicy,
});

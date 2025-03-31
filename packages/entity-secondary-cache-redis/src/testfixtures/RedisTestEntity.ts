import {
  AlwaysAllowPrivacyPolicyRule,
  EntityPrivacyPolicy,
  ViewerContext,
  StringField,
  EntityConfiguration,
  EntityCompanionDefinition,
  Entity,
  UUIDField,
} from '@expo/entity';

export type RedisTestEntityFields = {
  id: string;
  name: string;
};

export default class RedisTestEntity extends Entity<RedisTestEntityFields, 'id', ViewerContext> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    RedisTestEntityFields,
    'id',
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
  'id',
  ViewerContext,
  RedisTestEntity
> {
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<RedisTestEntityFields, 'id', ViewerContext, RedisTestEntity>(),
  ];
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<RedisTestEntityFields, 'id', ViewerContext, RedisTestEntity>(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<RedisTestEntityFields, 'id', ViewerContext, RedisTestEntity>(),
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<RedisTestEntityFields, 'id', ViewerContext, RedisTestEntity>(),
  ];
}

export const redisTestEntityConfiguration = new EntityConfiguration<RedisTestEntityFields, 'id'>({
  idField: 'id',
  tableName: 'redis_test_entities',
  schema: {
    id: new UUIDField({
      columnName: 'id',
    }),
    name: new StringField({
      columnName: 'name',
    }),
  },
  databaseAdapterFlavor: 'postgres',
  cacheAdapterFlavor: 'redis',
});

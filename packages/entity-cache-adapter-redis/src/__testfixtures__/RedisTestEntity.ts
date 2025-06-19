import {
  AlwaysAllowPrivacyPolicyRule,
  DateField,
  Entity,
  EntityCompanionDefinition,
  EntityConfiguration,
  EntityPrivacyPolicy,
  StringField,
  UUIDField,
  ViewerContext,
} from '@expo/entity';

export type RedisTestEntityFields = {
  id: string;
  name: string;
  dateField: Date | null;
};

export class RedisTestEntity extends Entity<RedisTestEntityFields, 'id', ViewerContext> {
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
  compositeFieldDefinitions: [
    { compositeField: ['id', 'name'], cache: true },
    { compositeField: ['id', 'dateField'], cache: true },
  ],
});

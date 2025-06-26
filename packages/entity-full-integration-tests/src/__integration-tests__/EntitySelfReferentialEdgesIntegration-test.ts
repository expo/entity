import {
  AlwaysAllowPrivacyPolicyRule,
  Entity,
  EntityCompanionDefinition,
  EntityConfiguration,
  EntityEdgeDeletionBehavior,
  EntityPrivacyPolicy,
  UUIDField,
  ViewerContext,
} from '@expo/entity';
import {
  GenericRedisCacheContext,
  RedisCacheInvalidationStrategy,
} from '@expo/entity-cache-adapter-redis';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';

import {
  type Knex,
  type Redis,
  type StartedPostgreSqlContainer,
  type StartedRedisContainer,
  startServicesAsync,
} from './testcontainer';
import { createFullIntegrationTestEntityCompanionProvider } from '../__testfixtures__/createFullIntegrationTestEntityCompanionProvider';

interface CategoryFields {
  id: string;
  parent_other_id: string;
}

interface OtherFields {
  id: string;
  parent_category_id: string;
}

class PrivacyPolicy extends EntityPrivacyPolicy<any, 'id', ViewerContext, any> {
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<any, 'id', ViewerContext, any>(),
  ];
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<any, 'id', ViewerContext, any>(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<any, 'id', ViewerContext, any>(),
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<any, 'id', ViewerContext, any>(),
  ];
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const makeEntityClasses = async (knex: Knex, edgeDeletionBehavior: EntityEdgeDeletionBehavior) => {
  const categoriesTableName = uuidv4();
  const othersTableName = uuidv4();

  class CategoryEntity extends Entity<CategoryFields, 'id', ViewerContext> {
    static defineCompanionDefinition(): EntityCompanionDefinition<
      CategoryFields,
      'id',
      ViewerContext,
      CategoryEntity,
      PrivacyPolicy
    > {
      return {
        entityClass: CategoryEntity,
        entityConfiguration: categoryEntityConfiguration,
        privacyPolicyClass: PrivacyPolicy,
      };
    }
  }

  class OtherEntity extends Entity<OtherFields, 'id', ViewerContext> {
    static defineCompanionDefinition(): EntityCompanionDefinition<
      OtherFields,
      'id',
      ViewerContext,
      OtherEntity,
      PrivacyPolicy
    > {
      return {
        entityClass: OtherEntity,
        entityConfiguration: otherEntityConfiguration,
        privacyPolicyClass: PrivacyPolicy,
      };
    }
  }

  const categoryEntityConfiguration = new EntityConfiguration<CategoryFields, 'id'>({
    idField: 'id',
    tableName: categoriesTableName,
    inboundEdges: [OtherEntity],
    schema: {
      id: new UUIDField({
        columnName: 'id',
        cache: true,
      }),
      parent_other_id: new UUIDField({
        columnName: 'parent_other_id',
        cache: true,
        association: {
          associatedEntityClass: OtherEntity,
          edgeDeletionBehavior,
        },
      }),
    },
    databaseAdapterFlavor: 'postgres',
    cacheAdapterFlavor: 'redis',
  });

  const otherEntityConfiguration = new EntityConfiguration<OtherFields, 'id'>({
    idField: 'id',
    tableName: othersTableName,
    inboundEdges: [CategoryEntity],
    schema: {
      id: new UUIDField({
        columnName: 'id',
        cache: true,
      }),
      parent_category_id: new UUIDField({
        columnName: 'parent_category_id',
        cache: true,
        association: {
          associatedEntityClass: CategoryEntity,
          edgeDeletionBehavior,
        },
      }),
    },
    databaseAdapterFlavor: 'postgres',
    cacheAdapterFlavor: 'redis',
  });

  await knex.schema.createTable(categoriesTableName, (table) => {
    table.uuid('id').defaultTo(knex.raw('gen_random_uuid()')).primary();
  });

  await knex.schema.createTable(othersTableName, (table) => {
    table.uuid('id').defaultTo(knex.raw('gen_random_uuid()')).primary();
    if (edgeDeletionBehavior === EntityEdgeDeletionBehavior.CASCADE_DELETE_INVALIDATE_CACHE_ONLY) {
      table
        .uuid('parent_category_id')
        .references('id')
        .inTable(categoriesTableName)
        .unique()
        .onDelete('cascade');
    } else if (edgeDeletionBehavior === EntityEdgeDeletionBehavior.SET_NULL_INVALIDATE_CACHE_ONLY) {
      table
        .uuid('parent_category_id')
        .references('id')
        .inTable(categoriesTableName)
        .unique()
        .onDelete('set null');
    } else {
      table.uuid('parent_category_id').unique();
    }
  });

  await knex.schema.alterTable(categoriesTableName, (table) => {
    if (edgeDeletionBehavior === EntityEdgeDeletionBehavior.CASCADE_DELETE_INVALIDATE_CACHE_ONLY) {
      table
        .uuid('parent_other_id')
        .references('id')
        .inTable(othersTableName)
        .unique()
        .onDelete('cascade');
    } else if (edgeDeletionBehavior === EntityEdgeDeletionBehavior.SET_NULL_INVALIDATE_CACHE_ONLY) {
      table
        .uuid('parent_other_id')
        .references('id')
        .inTable(othersTableName)
        .unique()
        .onDelete('set null');
    } else {
      table.uuid('parent_other_id').unique();
    }
  });

  return { CategoryEntity, OtherEntity };
};
describe('EntityMutator.processEntityDeletionForInboundEdgesAsync', () => {
  let postgresContainer: StartedPostgreSqlContainer;
  let redisContainer: StartedRedisContainer;
  let knexInstance: Knex;
  let redisClient: Redis;
  let genericRedisCacheContext: GenericRedisCacheContext;

  beforeAll(async () => {
    ({ knexInstance, redisClient, postgresContainer, redisContainer } = await startServicesAsync());
    genericRedisCacheContext = {
      redisClient,
      makeKeyFn(...parts: string[]): string {
        const delimiter = ':';
        const escapedParts = parts.map((part) =>
          part.replace('\\', '\\\\').replace(delimiter, `\\${delimiter}`),
        );
        return escapedParts.join(delimiter);
      },
      cacheKeyPrefix: 'test-',
      ttlSecondsPositive: 86400, // 1 day
      ttlSecondsNegative: 600, // 10 minutes
      invalidationConfig: {
        invalidationStrategy: RedisCacheInvalidationStrategy.CURRENT_CACHE_KEY_VERSION,
      },
    };
  });

  afterAll(async () => {
    await knexInstance.destroy();
    redisClient.disconnect();
    await postgresContainer.stop();
    await redisContainer.stop();
  });

  it.each([
    EntityEdgeDeletionBehavior.CASCADE_DELETE,
    EntityEdgeDeletionBehavior.CASCADE_DELETE_INVALIDATE_CACHE_ONLY,
    EntityEdgeDeletionBehavior.SET_NULL,
    EntityEdgeDeletionBehavior.SET_NULL_INVALIDATE_CACHE_ONLY,
  ])('behavior: %p', async (edgeDeletionBehavior) => {
    const { CategoryEntity, OtherEntity } = await makeEntityClasses(
      knexInstance,
      edgeDeletionBehavior,
    );

    const viewerContext = new ViewerContext(
      createFullIntegrationTestEntityCompanionProvider(knexInstance, genericRedisCacheContext),
    );

    const category1 = await CategoryEntity.creator(viewerContext).createAsync();
    const other1 = await OtherEntity.creator(viewerContext)
      .setField('parent_category_id', category1.getID())
      .createAsync();
    await CategoryEntity.updater(category1)
      .setField('parent_other_id', other1.getID())
      .updateAsync();

    await CategoryEntity.deleter(category1).deleteAsync();

    if (edgeDeletionBehavior === EntityEdgeDeletionBehavior.SET_NULL) {
      await expect(
        CategoryEntity.loader(viewerContext).loadByIDNullableAsync(category1.getID()),
      ).resolves.toBeNull();
      const otherLoaded = await OtherEntity.loader(viewerContext).loadByIDNullableAsync(
        other1.getID(),
      );
      expect(otherLoaded?.getField('parent_category_id')).toBeNull();
    } else if (edgeDeletionBehavior === EntityEdgeDeletionBehavior.SET_NULL_INVALIDATE_CACHE_ONLY) {
      await expect(
        CategoryEntity.loader(viewerContext).loadByIDNullableAsync(category1.getID()),
      ).resolves.toBeNull();
      const otherLoaded = await OtherEntity.loader(viewerContext).loadByIDNullableAsync(
        other1.getID(),
      );
      expect(otherLoaded?.getField('parent_category_id')).toBeNull();
    } else {
      await expect(
        CategoryEntity.loader(viewerContext).loadByIDNullableAsync(category1.getID()),
      ).resolves.toBeNull();
      await expect(
        OtherEntity.loader(viewerContext).loadByIDNullableAsync(other1.getID()),
      ).resolves.toBeNull();
    }
  });
});

import {
  EntityPrivacyPolicy,
  ViewerContext,
  AlwaysAllowPrivacyPolicyRule,
  Entity,
  EntityCompanionDefinition,
  EntityConfiguration,
  UUIDField,
  EntityEdgeDeletionBehavior,
} from '@expo/entity';
import { RedisCacheAdapterContext } from '@expo/entity-cache-adapter-redis';
import Redis from 'ioredis';
import { knex, Knex } from 'knex';
import { URL } from 'url';
import { v4 as uuidv4 } from 'uuid';

import { createFullIntegrationTestEntityCompanionProvider } from '../testfixtures/createFullIntegrationTestEntityCompanionProvider';

interface CategoryFields {
  id: string;
  parent_other_id: string;
}

interface OtherFields {
  id: string;
  parent_category_id: string;
}

class PrivacyPolicy extends EntityPrivacyPolicy<any, string, ViewerContext, any> {
  protected readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<any, string, ViewerContext, any>(),
  ];
  protected readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<any, string, ViewerContext, any>(),
  ];
  protected readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<any, string, ViewerContext, any>(),
  ];
  protected readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<any, string, ViewerContext, any>(),
  ];
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const makeEntityClasses = async (knex: Knex, edgeDeletionBehavior: EntityEdgeDeletionBehavior) => {
  const categoriesTableName = uuidv4();
  const othersTableName = uuidv4();

  class CategoryEntity extends Entity<CategoryFields, string, ViewerContext> {
    static getCompanionDefinition(): EntityCompanionDefinition<
      CategoryFields,
      string,
      ViewerContext,
      CategoryEntity,
      PrivacyPolicy
    > {
      return categoryEntityCompanion;
    }
  }

  class OtherEntity extends Entity<OtherFields, string, ViewerContext> {
    static getCompanionDefinition(): EntityCompanionDefinition<
      OtherFields,
      string,
      ViewerContext,
      OtherEntity,
      PrivacyPolicy
    > {
      return otherEntityCompanion;
    }
  }

  const categoryEntityConfiguration = new EntityConfiguration<CategoryFields>({
    idField: 'id',
    tableName: categoriesTableName,
    getInboundEdges: () => [OtherEntity],
    schema: {
      id: new UUIDField({
        columnName: 'id',
        cache: true,
      }),
      parent_other_id: new UUIDField({
        columnName: 'parent_other_id',
        cache: true,
        association: {
          getAssociatedEntityClass: () => OtherEntity,
          edgeDeletionBehavior,
        },
      }),
    },
    databaseAdapterFlavor: 'postgres',
    cacheAdapterFlavor: 'redis',
  });

  const categoryEntityCompanion = new EntityCompanionDefinition({
    entityClass: CategoryEntity,
    entityConfiguration: categoryEntityConfiguration,
    privacyPolicyClass: PrivacyPolicy,
  });

  const otherEntityConfiguration = new EntityConfiguration<OtherFields>({
    idField: 'id',
    tableName: othersTableName,
    getInboundEdges: () => [CategoryEntity],
    schema: {
      id: new UUIDField({
        columnName: 'id',
        cache: true,
      }),
      parent_category_id: new UUIDField({
        columnName: 'parent_category_id',
        cache: true,
        association: {
          getAssociatedEntityClass: () => CategoryEntity,
          edgeDeletionBehavior,
        },
      }),
    },
    databaseAdapterFlavor: 'postgres',
    cacheAdapterFlavor: 'redis',
  });

  const otherEntityCompanion = new EntityCompanionDefinition({
    entityClass: OtherEntity,
    entityConfiguration: otherEntityConfiguration,
    privacyPolicyClass: PrivacyPolicy,
  });

  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"'); // for uuid_generate_v4()

  await knex.schema.createTable(categoriesTableName, (table) => {
    table.uuid('id').defaultTo(knex.raw('uuid_generate_v4()')).primary();
  });

  await knex.schema.createTable(othersTableName, (table) => {
    table.uuid('id').defaultTo(knex.raw('uuid_generate_v4()')).primary();
    if (edgeDeletionBehavior === EntityEdgeDeletionBehavior.CASCADE_DELETE_INVALIDATE_CACHE) {
      table
        .uuid('parent_category_id')
        .references('id')
        .inTable(categoriesTableName)
        .unique()
        .onDelete('cascade');
    } else {
      table.uuid('parent_category_id').unique();
    }
  });

  await knex.schema.alterTable(categoriesTableName, (table) => {
    if (edgeDeletionBehavior === EntityEdgeDeletionBehavior.CASCADE_DELETE_INVALIDATE_CACHE) {
      table
        .uuid('parent_other_id')
        .references('id')
        .inTable(othersTableName)
        .unique()
        .onDelete('cascade');
    } else {
      table.uuid('parent_other_id').unique();
    }
  });

  return { CategoryEntity, OtherEntity };
};
describe('EntityMutator.processEntityDeletionForInboundEdgesAsync', () => {
  let knexInstance: Knex;
  let redisCacheAdapterContext: RedisCacheAdapterContext;

  beforeAll(() => {
    knexInstance = knex({
      client: 'pg',
      connection: {
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        host: 'localhost',
        port: parseInt(process.env.PGPORT!, 10),
        database: process.env.PGDATABASE,
      },
    });
    redisCacheAdapterContext = {
      redisClient: new Redis(new URL(process.env.REDIS_URL!).toString()),
      makeKeyFn(...parts: string[]): string {
        const delimiter = ':';
        const escapedParts = parts.map((part) =>
          part.replace('\\', '\\\\').replace(delimiter, `\\${delimiter}`)
        );
        return escapedParts.join(delimiter);
      },
      cacheKeyPrefix: 'test-',
      cacheKeyVersion: 1,
      ttlSecondsPositive: 86400, // 1 day
      ttlSecondsNegative: 600, // 10 minutes
    };
  });

  afterAll(async () => {
    await knexInstance.destroy();
    redisCacheAdapterContext.redisClient.disconnect();
  });

  it.each([
    EntityEdgeDeletionBehavior.CASCADE_DELETE,
    EntityEdgeDeletionBehavior.CASCADE_DELETE_INVALIDATE_CACHE,
    EntityEdgeDeletionBehavior.SET_NULL,
  ])('behavior: %p', async (edgeDeletionBehavior) => {
    const { CategoryEntity, OtherEntity } = await makeEntityClasses(
      knexInstance,
      edgeDeletionBehavior
    );

    const viewerContext = new ViewerContext(
      createFullIntegrationTestEntityCompanionProvider(knexInstance, redisCacheAdapterContext)
    );

    const category1 = await CategoryEntity.creator(viewerContext).enforceCreateAsync();
    const other1 = await OtherEntity.creator(viewerContext)
      .setField('parent_category_id', category1.getID())
      .enforceCreateAsync();
    await CategoryEntity.updater(category1)
      .setField('parent_other_id', other1.getID())
      .enforceUpdateAsync();

    await CategoryEntity.enforceDeleteAsync(category1);

    if (edgeDeletionBehavior === EntityEdgeDeletionBehavior.SET_NULL) {
      await expect(
        CategoryEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(category1.getID())
      ).resolves.toBeNull();
      const otherLoaded = await OtherEntity.loader(viewerContext)
        .enforcing()
        .loadByIDNullableAsync(other1.getID());
      expect(otherLoaded?.getField('parent_category_id')).toBeNull();
    } else {
      await expect(
        CategoryEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(category1.getID())
      ).resolves.toBeNull();
      await expect(
        OtherEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(other1.getID())
      ).resolves.toBeNull();
    }
  });
});

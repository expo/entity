import {
  AlwaysAllowPrivacyPolicyRule,
  EntityCompanionDefinition,
  EntityConfiguration,
  EntityPrivacyPolicy,
  StringField,
  UUIDField,
  ViewerContext,
} from '@expo/entity';
import { describe, expect, it } from '@jest/globals';

import { AuthorizationResultBasedKnexEntityLoader } from '../AuthorizationResultBasedKnexEntityLoader';
import { EnforcingKnexEntityLoader } from '../EnforcingKnexEntityLoader';
import { PostgresEntity } from '../PostgresEntity';
import { ReadonlyPostgresEntity } from '../ReadonlyPostgresEntity';
import { createUnitTestPostgresEntityCompanionProvider } from './fixtures/createUnitTestPostgresEntityCompanionProvider';

type TestPostgresFields = {
  id: string;
  name: string;
};

const testPostgresEntityConfiguration = new EntityConfiguration<TestPostgresFields, 'id'>({
  idField: 'id',
  tableName: 'postgres_entity_test',
  schema: {
    id: new UUIDField({ columnName: 'id', cache: true }),
    name: new StringField({ columnName: 'name' }),
  },
  databaseAdapterFlavor: 'postgres',
  cacheAdapterFlavor: 'redis',
});

class TestPostgresEntityPrivacyPolicy extends EntityPrivacyPolicy<
  TestPostgresFields,
  'id',
  ViewerContext,
  TestPostgresEntity
> {
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<TestPostgresFields, 'id', ViewerContext, TestPostgresEntity>(),
  ];
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<TestPostgresFields, 'id', ViewerContext, TestPostgresEntity>(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<TestPostgresFields, 'id', ViewerContext, TestPostgresEntity>(),
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<TestPostgresFields, 'id', ViewerContext, TestPostgresEntity>(),
  ];
}

class TestPostgresEntity extends PostgresEntity<TestPostgresFields, 'id', ViewerContext> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    TestPostgresFields,
    'id',
    ViewerContext,
    TestPostgresEntity,
    TestPostgresEntityPrivacyPolicy
  > {
    return {
      entityClass: TestPostgresEntity,
      entityConfiguration: testPostgresEntityConfiguration,
      privacyPolicyClass: TestPostgresEntityPrivacyPolicy,
    };
  }
}

class TestReadonlyPostgresEntityPrivacyPolicy extends EntityPrivacyPolicy<
  TestPostgresFields,
  'id',
  ViewerContext,
  TestReadonlyPostgresEntity
> {
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<
      TestPostgresFields,
      'id',
      ViewerContext,
      TestReadonlyPostgresEntity
    >(),
  ];
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<
      TestPostgresFields,
      'id',
      ViewerContext,
      TestReadonlyPostgresEntity
    >(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<
      TestPostgresFields,
      'id',
      ViewerContext,
      TestReadonlyPostgresEntity
    >(),
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<
      TestPostgresFields,
      'id',
      ViewerContext,
      TestReadonlyPostgresEntity
    >(),
  ];
}

class TestReadonlyPostgresEntity extends ReadonlyPostgresEntity<
  TestPostgresFields,
  'id',
  ViewerContext
> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    TestPostgresFields,
    'id',
    ViewerContext,
    TestReadonlyPostgresEntity,
    TestReadonlyPostgresEntityPrivacyPolicy
  > {
    return {
      entityClass: TestReadonlyPostgresEntity,
      entityConfiguration: testPostgresEntityConfiguration,
      privacyPolicyClass: TestReadonlyPostgresEntityPrivacyPolicy,
    };
  }
}

describe(PostgresEntity, () => {
  describe('knexLoader', () => {
    it('creates a new EnforcingKnexEntityLoader', () => {
      const companionProvider = createUnitTestPostgresEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);
      expect(TestPostgresEntity.knexLoader(viewerContext)).toBeInstanceOf(
        EnforcingKnexEntityLoader,
      );
    });
  });

  describe('knexLoaderWithAuthorizationResults', () => {
    it('creates a new AuthorizationResultBasedKnexEntityLoader', () => {
      const companionProvider = createUnitTestPostgresEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);
      expect(TestPostgresEntity.knexLoaderWithAuthorizationResults(viewerContext)).toBeInstanceOf(
        AuthorizationResultBasedKnexEntityLoader,
      );
    });
  });
});

describe(ReadonlyPostgresEntity, () => {
  describe('knexLoader', () => {
    it('creates a new EnforcingKnexEntityLoader', () => {
      const companionProvider = createUnitTestPostgresEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);
      expect(TestReadonlyPostgresEntity.knexLoader(viewerContext)).toBeInstanceOf(
        EnforcingKnexEntityLoader,
      );
    });
  });

  describe('knexLoaderWithAuthorizationResults', () => {
    it('creates a new AuthorizationResultBasedKnexEntityLoader', () => {
      const companionProvider = createUnitTestPostgresEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);
      expect(
        TestReadonlyPostgresEntity.knexLoaderWithAuthorizationResults(viewerContext),
      ).toBeInstanceOf(AuthorizationResultBasedKnexEntityLoader);
    });
  });
});

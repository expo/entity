import Entity from '../Entity';
import {
  DatabaseAdapterFlavor,
  CacheAdapterFlavor,
  EntityCompanionDefinition,
} from '../EntityCompanionProvider';
import EntityConfiguration from '../EntityConfiguration';
import { UUIDField } from '../EntityFields';
import { CreateMutator, UpdateMutator } from '../EntityMutator';
import EntityPrivacyPolicy from '../EntityPrivacyPolicy';
import ViewerContext from '../ViewerContext';
import AlwaysAllowPrivacyPolicyRule from '../rules/AlwaysAllowPrivacyPolicyRule';
import AlwaysDenyPrivacyPolicyRule from '../rules/AlwaysDenyPrivacyPolicyRule';
import SimpleTestEntity from '../testfixtures/SimpleTestEntity';
import { createUnitTestEntityCompanionProvider } from '../utils/testing/createUnitTestEntityCompanionProvider';

describe(Entity, () => {
  describe('creator', () => {
    it('creates a new CreateMutator', () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);
      expect(SimpleTestEntity.creator(viewerContext)).toBeInstanceOf(CreateMutator);
    });
  });

  describe('updater', () => {
    it('creates a new UpdateMutator', () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);
      const data = {
        id: 'what',
      };
      const testEntity = new SimpleTestEntity(viewerContext, data);
      expect(SimpleTestEntity.updater(testEntity)).toBeInstanceOf(UpdateMutator);
    });
  });

  describe('canViewerUpdateAsync', () => {
    it('appropriately executes update privacy policy', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);
      const data = {
        id: 'what',
      };
      const testEntity = new SimpleTestDenyDeleteEntity(viewerContext, data);
      const canViewerUpdate = await SimpleTestDenyDeleteEntity.canViewerUpdateAsync(testEntity);
      expect(canViewerUpdate).toBe(true);
    });

    it('denies when policy denies', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);
      const data = {
        id: 'what',
      };
      const testEntity = new SimpleTestDenyUpdateEntity(viewerContext, data);
      const canViewerUpdate = await SimpleTestDenyUpdateEntity.canViewerUpdateAsync(testEntity);
      expect(canViewerUpdate).toBe(false);
    });
  });

  describe('canViewerDeleteAsync', () => {
    it('appropriately executes update privacy policy', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);
      const data = {
        id: 'what',
      };
      const testEntity = new SimpleTestDenyUpdateEntity(viewerContext, data);
      const canViewerDelete = await SimpleTestDenyUpdateEntity.canViewerDeleteAsync(testEntity);
      expect(canViewerDelete).toBe(true);
    });

    it('denies when policy denies', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new ViewerContext(companionProvider);
      const data = {
        id: 'what',
      };
      const testEntity = new SimpleTestDenyDeleteEntity(viewerContext, data);
      const canViewerDelete = await SimpleTestDenyDeleteEntity.canViewerDeleteAsync(testEntity);
      expect(canViewerDelete).toBe(false);
    });
  });
});

type TestEntityFields = {
  id: string;
};

const testEntityConfiguration = new EntityConfiguration<TestEntityFields>({
  idField: 'id',
  tableName: 'blah',
  schema: {
    id: new UUIDField({
      columnName: 'custom_id',
    }),
  },
  databaseAdapterFlavor: DatabaseAdapterFlavor.POSTGRES,
  cacheAdapterFlavor: CacheAdapterFlavor.REDIS,
});

class SimpleTestDenyUpdateEntityPrivacyPolicy extends EntityPrivacyPolicy<
  TestEntityFields,
  string,
  ViewerContext,
  SimpleTestDenyUpdateEntity
> {
  protected readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<
      TestEntityFields,
      string,
      ViewerContext,
      SimpleTestDenyUpdateEntity
    >(),
  ];
  protected readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<
      TestEntityFields,
      string,
      ViewerContext,
      SimpleTestDenyUpdateEntity
    >(),
  ];
  protected readonly updateRules = [
    new AlwaysDenyPrivacyPolicyRule<
      TestEntityFields,
      string,
      ViewerContext,
      SimpleTestDenyUpdateEntity
    >(),
  ];
  protected readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<
      TestEntityFields,
      string,
      ViewerContext,
      SimpleTestDenyUpdateEntity
    >(),
  ];
}

class SimpleTestDenyDeleteEntityPrivacyPolicy extends EntityPrivacyPolicy<
  TestEntityFields,
  string,
  ViewerContext,
  SimpleTestDenyDeleteEntity
> {
  protected readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<
      TestEntityFields,
      string,
      ViewerContext,
      SimpleTestDenyDeleteEntity
    >(),
  ];
  protected readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<
      TestEntityFields,
      string,
      ViewerContext,
      SimpleTestDenyDeleteEntity
    >(),
  ];
  protected readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<
      TestEntityFields,
      string,
      ViewerContext,
      SimpleTestDenyDeleteEntity
    >(),
  ];
  protected readonly deleteRules = [
    new AlwaysDenyPrivacyPolicyRule<
      TestEntityFields,
      string,
      ViewerContext,
      SimpleTestDenyDeleteEntity
    >(),
  ];
}

class SimpleTestDenyUpdateEntity extends Entity<TestEntityFields, string, ViewerContext> {
  static getCompanionDefinition(): EntityCompanionDefinition<
    TestEntityFields,
    string,
    ViewerContext,
    SimpleTestDenyUpdateEntity,
    SimpleTestDenyUpdateEntityPrivacyPolicy
  > {
    return simpleTestDenyUpdateEntityCompanion;
  }
}

const simpleTestDenyUpdateEntityCompanion = new EntityCompanionDefinition({
  entityClass: SimpleTestDenyUpdateEntity,
  entityConfiguration: testEntityConfiguration,
  privacyPolicyClass: SimpleTestDenyUpdateEntityPrivacyPolicy,
});

class SimpleTestDenyDeleteEntity extends Entity<TestEntityFields, string, ViewerContext> {
  static getCompanionDefinition(): EntityCompanionDefinition<
    TestEntityFields,
    string,
    ViewerContext,
    SimpleTestDenyDeleteEntity,
    SimpleTestDenyDeleteEntityPrivacyPolicy
  > {
    return simpleTestDenyDeleteEntityCompanion;
  }
}

const simpleTestDenyDeleteEntityCompanion = new EntityCompanionDefinition({
  entityClass: SimpleTestDenyDeleteEntity,
  entityConfiguration: testEntityConfiguration,
  privacyPolicyClass: SimpleTestDenyDeleteEntityPrivacyPolicy,
});

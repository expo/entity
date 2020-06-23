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
});

class SimpleTestDenyUpdateEntityPrivacyPolicy extends EntityPrivacyPolicy<
  TestEntityFields,
  string,
  ViewerContext,
  SimpleTestDenyUpdateEntity
> {
  protected readonly readRules = [new AlwaysAllowPrivacyPolicyRule()];
  protected readonly createRules = [new AlwaysAllowPrivacyPolicyRule()];
  protected readonly updateRules = [new AlwaysDenyPrivacyPolicyRule()];
  protected readonly deleteRules = [new AlwaysAllowPrivacyPolicyRule()];
}

class SimpleTestDenyDeleteEntityPrivacyPolicy extends EntityPrivacyPolicy<
  TestEntityFields,
  string,
  ViewerContext,
  SimpleTestDenyDeleteEntity
> {
  protected readonly readRules = [new AlwaysAllowPrivacyPolicyRule()];
  protected readonly createRules = [new AlwaysAllowPrivacyPolicyRule()];
  protected readonly updateRules = [new AlwaysAllowPrivacyPolicyRule()];
  protected readonly deleteRules = [new AlwaysDenyPrivacyPolicyRule()];
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
  databaseAdaptorFlavor: DatabaseAdapterFlavor.POSTGRES,
  cacheAdaptorFlavor: CacheAdapterFlavor.REDIS,
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
  databaseAdaptorFlavor: DatabaseAdapterFlavor.POSTGRES,
  cacheAdaptorFlavor: CacheAdapterFlavor.REDIS,
  privacyPolicyClass: SimpleTestDenyDeleteEntityPrivacyPolicy,
});

import Entity from '../Entity';
import { EntityCompanionDefinition } from '../EntityCompanionProvider';
import EntityConfiguration from '../EntityConfiguration';
import { UUIDField } from '../EntityFields';
import { CreateMutator, UpdateMutator } from '../EntityMutator';
import EntityPrivacyPolicy from '../EntityPrivacyPolicy';
import AlwaysAllowPrivacyPolicyRule from '../rules/AlwaysAllowPrivacyPolicyRule';
import AlwaysDenyPrivacyPolicyRule from '../rules/AlwaysDenyPrivacyPolicyRule';
import SimpleTestEntity from '../testfixtures/SimpleTestEntity';
import TestViewerContext from '../testfixtures/TestViewerContext';
import { createUnitTestEntityCompanionProvider } from '../utils/testing/createUnitTestEntityCompanionProvider';

describe(Entity, () => {
  describe('creator', () => {
    it('creates a new CreateMutator', () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new TestViewerContext(companionProvider);
      expect(
        SimpleTestEntity.creator(viewerContext, viewerContext.getQueryContext())
      ).toBeInstanceOf(CreateMutator);
    });
  });

  describe('updater', () => {
    it('creates a new UpdateMutator', () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new TestViewerContext(companionProvider);
      const data = {
        id: 'what',
      };
      const testEntity = new SimpleTestEntity({
        viewerContext,
        id: 'what',
        databaseFields: data,
        selectedFields: data,
      });
      expect(SimpleTestEntity.updater(testEntity, viewerContext.getQueryContext())).toBeInstanceOf(
        UpdateMutator
      );
    });
  });

  describe('canViewerUpdateAsync', () => {
    it('appropriately executes update privacy policy', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new TestViewerContext(companionProvider);
      const data = {
        id: 'what',
      };
      const testEntity = new SimpleTestDenyDeleteEntity({
        viewerContext,
        id: 'what',
        databaseFields: data,
        selectedFields: data,
      });
      const canViewerUpdate = await SimpleTestDenyDeleteEntity.canViewerUpdateAsync(
        testEntity,
        viewerContext.getQueryContext()
      );
      expect(canViewerUpdate).toBe(true);
    });

    it('denies when policy denies', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new TestViewerContext(companionProvider);
      const data = {
        id: 'what',
      };
      const testEntity = new SimpleTestDenyUpdateEntity({
        viewerContext,
        id: 'what',
        databaseFields: data,
        selectedFields: data,
      });
      const canViewerUpdate = await SimpleTestDenyUpdateEntity.canViewerUpdateAsync(
        testEntity,
        viewerContext.getQueryContext()
      );
      expect(canViewerUpdate).toBe(false);
    });
  });

  describe('canViewerDeleteAsync', () => {
    it('appropriately executes update privacy policy', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new TestViewerContext(companionProvider);
      const data = {
        id: 'what',
      };
      const testEntity = new SimpleTestDenyUpdateEntity({
        viewerContext,
        id: 'what',
        databaseFields: data,
        selectedFields: data,
      });
      const canViewerDelete = await SimpleTestDenyUpdateEntity.canViewerDeleteAsync(
        testEntity,
        viewerContext.getQueryContext()
      );
      expect(canViewerDelete).toBe(true);
    });

    it('denies when policy denies', async () => {
      const companionProvider = createUnitTestEntityCompanionProvider();
      const viewerContext = new TestViewerContext(companionProvider);
      const data = {
        id: 'what',
      };
      const testEntity = new SimpleTestDenyDeleteEntity({
        viewerContext,
        id: 'what',
        databaseFields: data,
        selectedFields: data,
      });
      const canViewerDelete = await SimpleTestDenyDeleteEntity.canViewerDeleteAsync(
        testEntity,
        viewerContext.getQueryContext()
      );
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
  databaseAdapterFlavor: 'postgres',
  cacheAdapterFlavor: 'redis',
});

class SimpleTestDenyUpdateEntityPrivacyPolicy extends EntityPrivacyPolicy<
  TestEntityFields,
  string,
  TestViewerContext,
  SimpleTestDenyUpdateEntity
> {
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<
      TestEntityFields,
      string,
      TestViewerContext,
      SimpleTestDenyUpdateEntity
    >(),
  ];
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<
      TestEntityFields,
      string,
      TestViewerContext,
      SimpleTestDenyUpdateEntity
    >(),
  ];
  protected override readonly updateRules = [
    new AlwaysDenyPrivacyPolicyRule<
      TestEntityFields,
      string,
      TestViewerContext,
      SimpleTestDenyUpdateEntity
    >(),
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<
      TestEntityFields,
      string,
      TestViewerContext,
      SimpleTestDenyUpdateEntity
    >(),
  ];
}

class SimpleTestDenyDeleteEntityPrivacyPolicy extends EntityPrivacyPolicy<
  TestEntityFields,
  string,
  TestViewerContext,
  SimpleTestDenyDeleteEntity
> {
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<
      TestEntityFields,
      string,
      TestViewerContext,
      SimpleTestDenyDeleteEntity
    >(),
  ];
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<
      TestEntityFields,
      string,
      TestViewerContext,
      SimpleTestDenyDeleteEntity
    >(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<
      TestEntityFields,
      string,
      TestViewerContext,
      SimpleTestDenyDeleteEntity
    >(),
  ];
  protected override readonly deleteRules = [
    new AlwaysDenyPrivacyPolicyRule<
      TestEntityFields,
      string,
      TestViewerContext,
      SimpleTestDenyDeleteEntity
    >(),
  ];
}

class SimpleTestDenyUpdateEntity extends Entity<TestEntityFields, string, TestViewerContext> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    TestEntityFields,
    string,
    TestViewerContext,
    SimpleTestDenyUpdateEntity,
    SimpleTestDenyUpdateEntityPrivacyPolicy
  > {
    return {
      entityClass: SimpleTestDenyUpdateEntity,
      entityConfiguration: testEntityConfiguration,
      privacyPolicyClass: SimpleTestDenyUpdateEntityPrivacyPolicy,
    };
  }
}

class SimpleTestDenyDeleteEntity extends Entity<TestEntityFields, string, TestViewerContext> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    TestEntityFields,
    string,
    TestViewerContext,
    SimpleTestDenyDeleteEntity,
    SimpleTestDenyDeleteEntityPrivacyPolicy
  > {
    return {
      entityClass: SimpleTestDenyDeleteEntity,
      entityConfiguration: testEntityConfiguration,
      privacyPolicyClass: SimpleTestDenyDeleteEntityPrivacyPolicy,
    };
  }
}

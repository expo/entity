import Entity from '../Entity';
import { EntityCompanionDefinition } from '../EntityCompanionProvider';
import EntityConfiguration from '../EntityConfiguration';
import { UUIDField } from '../EntityFields';
import { EntityMutationType, EntityTriggerMutationInfo } from '../EntityMutationInfo';
import { EntityNonTransactionalMutationTrigger } from '../EntityMutationTriggerConfiguration';
import EntityPrivacyPolicy from '../EntityPrivacyPolicy';
import ViewerContext from '../ViewerContext';
import AlwaysAllowPrivacyPolicyRule from '../rules/AlwaysAllowPrivacyPolicyRule';
import { createUnitTestEntityCompanionProvider } from '../utils/testing/createUnitTestEntityCompanionProvider';

type BlahFields = {
  id: string;
};

class BlahEntityPrivacyPolicy extends EntityPrivacyPolicy<
  BlahFields,
  string,
  ViewerContext,
  BlahEntity
> {
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<BlahFields, string, ViewerContext, BlahEntity>(),
  ];
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<BlahFields, string, ViewerContext, BlahEntity>(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<BlahFields, string, ViewerContext, BlahEntity>(),
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<BlahFields, string, ViewerContext, BlahEntity>(),
  ];
}

class BlahEntity extends Entity<BlahFields, string, ViewerContext> {
  static getCompanionDefinition(): EntityCompanionDefinition<
    BlahFields,
    string,
    ViewerContext,
    BlahEntity,
    BlahEntityPrivacyPolicy
  > {
    return blahCompanion;
  }
}

const blahConfiguration = new EntityConfiguration<BlahFields>({
  idField: 'id',
  tableName: 'blah_table',
  schema: {
    id: new UUIDField({
      columnName: 'id',
      cache: true,
    }),
  },
  databaseAdapterFlavor: 'postgres',
  cacheAdapterFlavor: 'redis',
});

const blahCompanion = new EntityCompanionDefinition({
  entityClass: BlahEntity,
  entityConfiguration: blahConfiguration,
  privacyPolicyClass: BlahEntityPrivacyPolicy,
  mutationTriggers: () => ({
    afterCommit: [new TestNonTransactionalMutationTrigger()],
  }),
});

class TestNonTransactionalMutationTrigger extends EntityNonTransactionalMutationTrigger<
  BlahFields,
  string,
  ViewerContext,
  BlahEntity
> {
  async executeAsync(
    viewerContext: ViewerContext,
    entity: BlahEntity,
    mutationInfo: EntityTriggerMutationInfo<BlahFields, string, ViewerContext, BlahEntity>
  ): Promise<void> {
    if (mutationInfo.type === EntityMutationType.DELETE) {
      const entityLoaded = await BlahEntity.loader(viewerContext)
        .enforcing()
        .loadByIDNullableAsync(entity.getID());
      if (entityLoaded) {
        throw new Error(
          'should not have been able to re-load the entity after delete. this means the cache has not been cleared'
        );
      }
    }
  }
}

describe('EntityMutator', () => {
  test('cache consistency with post-commit callbacks', async () => {
    const companionProvider = createUnitTestEntityCompanionProvider();
    const viewerContext = new ViewerContext(companionProvider);

    // put it in cache
    const entity = await BlahEntity.creator(viewerContext).enforceCreateAsync();
    const entityLoaded = await BlahEntity.loader(viewerContext)
      .enforcing()
      .loadByIDAsync(entity.getID());

    await BlahEntity.enforceDeleteAsync(entityLoaded);
  });
});

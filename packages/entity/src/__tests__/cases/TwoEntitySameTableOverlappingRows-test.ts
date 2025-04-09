import Entity from '../../Entity';
import { EntityCompanionDefinition } from '../../EntityCompanionProvider';
import EntityConfiguration from '../../EntityConfiguration';
import { StringField, UUIDField } from '../../EntityFields';
import EntityPrivacyPolicy from '../../EntityPrivacyPolicy';
import ViewerContext from '../../ViewerContext';
import AlwaysAllowPrivacyPolicyRule from '../../rules/AlwaysAllowPrivacyPolicyRule';
import { createUnitTestEntityCompanionProvider } from '../../utils/__testfixtures__/createUnitTestEntityCompanionProvider';

describe('Two entities backed by the same table', () => {
  test('mutate through different types and keep consistent cache and dataloader', async () => {
    const companionProvider = createUnitTestEntityCompanionProvider();
    const viewerContext = new ViewerContext(companionProvider);

    const entity1 = await OneTestEntity.creator(viewerContext)
      .setField('fake_field', 'hello')
      .createAsync();
    expect(entity1).toBeInstanceOf(OneTestEntity);

    const entity2 = await TwoTestEntity.loader(viewerContext).loadByIDAsync(entity1.getID());
    expect(entity2).toBeInstanceOf(TwoTestEntity);

    const updated2 = await TwoTestEntity.updater(entity2)
      .setField('fake_field', 'world')
      .setField('other_field', 'wat')
      .updateAsync();
    expect(updated2.getAllFields()).toMatchObject({
      id: updated2.getID(),
      other_field: 'wat',
      fake_field: 'world',
    });

    const loaded1 = await OneTestEntity.loader(viewerContext).loadByIDAsync(entity1.getID());
    expect(loaded1.getAllFields()).toMatchObject({
      id: updated2.getID(),
      fake_field: 'world',
    });
  });

  test('cached field that differs between the two to test invalidation', async () => {
    const companionProvider = createUnitTestEntityCompanionProvider();
    const viewerContext = new ViewerContext(companionProvider);

    const entity = await TwoTestEntity.creator(viewerContext)
      .setField('fake_field', 'hello')
      .setField('other_field', 'huh')
      .createAsync();

    const loadedEntity = await TwoTestEntity.loader(viewerContext).loadByFieldEqualingAsync(
      'other_field',
      'huh',
    );
    expect(loadedEntity?.getAllFields()).toMatchObject({
      id: entity.getID(),
      fake_field: 'hello',
      other_field: 'huh',
    });

    const loaded1 = await OneTestEntity.loader(viewerContext).loadByIDAsync(entity.getID());
    await OneTestEntity.updater(loaded1).setField('fake_field', 'world').updateAsync();

    const loaded2 = await TwoTestEntity.loader(viewerContext).loadByFieldEqualingAsync(
      'other_field',
      'huh',
    );
    expect(loaded2?.getAllFields()).toMatchObject({
      id: entity.getID(),
      fake_field: 'world',
      other_field: 'huh',
    });

    const loaded22 = await TwoTestEntity.loader(viewerContext).loadByFieldEqualingAsync(
      'fake_field',
      'world',
    );
    expect(loaded22?.getAllFields()).toMatchObject({
      id: entity.getID(),
      fake_field: 'world',
      other_field: 'huh',
    });
  });
});

interface TestFields {
  id: string;
  other_field: string;
  fake_field: string;
}

type OneTestFields = 'id' | 'fake_field';
type TwoTestFields = 'id' | 'other_field' | 'fake_field';

const testEntityConfiguration = new EntityConfiguration<TestFields, 'id'>({
  idField: 'id',
  tableName: 'entities',
  schema: {
    id: new UUIDField({
      columnName: 'custom_id',
      cache: true,
    }),
    other_field: new StringField({
      columnName: 'other_field',
      cache: true,
    }),
    fake_field: new StringField({
      columnName: 'fake_field',
      cache: true,
    }),
  },
  databaseAdapterFlavor: 'postgres',
  cacheAdapterFlavor: 'redis',
});

class TestEntityPrivacyPolicy extends EntityPrivacyPolicy<any, 'id', ViewerContext, any, any> {
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<any, 'id', ViewerContext, any, any>(),
  ];
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<any, 'id', ViewerContext, any, any>(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<any, 'id', ViewerContext, any, any>(),
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<any, 'id', ViewerContext, any, any>(),
  ];
}

class OneTestEntity extends Entity<TestFields, 'id', ViewerContext, OneTestFields> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    TestFields,
    'id',
    ViewerContext,
    OneTestEntity,
    TestEntityPrivacyPolicy,
    OneTestFields
  > {
    return {
      entityClass: OneTestEntity,
      entityConfiguration: testEntityConfiguration,
      privacyPolicyClass: TestEntityPrivacyPolicy,
      entitySelectedFields: ['id', 'fake_field'],
    };
  }
}

class TwoTestEntity extends Entity<TestFields, 'id', ViewerContext, TwoTestFields> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    TestFields,
    'id',
    ViewerContext,
    TwoTestEntity,
    TestEntityPrivacyPolicy,
    TwoTestFields
  > {
    return {
      entityClass: TwoTestEntity,
      entityConfiguration: testEntityConfiguration,
      privacyPolicyClass: TestEntityPrivacyPolicy,
      entitySelectedFields: ['id', 'other_field', 'fake_field'],
    };
  }
}

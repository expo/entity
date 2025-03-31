import Entity from '../Entity';
import EntityCompanionProvider, { EntityCompanionDefinition } from '../EntityCompanionProvider';
import EntityConfiguration from '../EntityConfiguration';
import { StringField } from '../EntityFields';
import EntityPrivacyPolicy from '../EntityPrivacyPolicy';
import ViewerContext from '../ViewerContext';
import { createUnitTestEntityCompanionProvider } from '../utils/testing/createUnitTestEntityCompanionProvider';

type BlahFields = {
  hello: string;
};

const blahConfiguration = new EntityConfiguration<BlahFields, 'hello'>({
  idField: 'hello',
  tableName: 'wat',
  schema: {
    hello: new StringField({
      columnName: 'hello',
    }),
  },
  databaseAdapterFlavor: 'postgres',
  cacheAdapterFlavor: 'redis',
});

class Blah1Entity extends Entity<BlahFields, 'hello', ViewerContext> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    BlahFields,
    'hello',
    ViewerContext,
    Blah1Entity,
    NoOpTest1PrivacyPolicy
  > {
    return {
      entityClass: Blah1Entity,
      entityConfiguration: blahConfiguration,
      privacyPolicyClass: NoOpTest1PrivacyPolicy,
    };
  }
}

class Blah2Entity extends Entity<BlahFields, 'hello', ViewerContext> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    BlahFields,
    'hello',
    ViewerContext,
    Blah2Entity,
    NoOpTest2PrivacyPolicy
  > {
    return {
      entityClass: Blah2Entity,
      entityConfiguration: blahConfiguration,
      privacyPolicyClass: NoOpTest2PrivacyPolicy,
    };
  }
}

class NoOpTest1PrivacyPolicy extends EntityPrivacyPolicy<
  BlahFields,
  'hello',
  ViewerContext,
  Blah1Entity
> {}
class NoOpTest2PrivacyPolicy extends EntityPrivacyPolicy<
  BlahFields,
  'hello',
  ViewerContext,
  Blah2Entity
> {}

describe(EntityCompanionProvider, () => {
  it('returns different instances for different entity types, but share table data coordinators', () => {
    const entityCompanionProvider = createUnitTestEntityCompanionProvider();
    const companion1 = entityCompanionProvider.getCompanionForEntity(Blah1Entity);
    const companion2 = entityCompanionProvider.getCompanionForEntity(Blah2Entity);
    expect(companion1).not.toEqual(companion2);
    expect(companion1['tableDataCoordinator']).toEqual(companion2['tableDataCoordinator']);
  });
});

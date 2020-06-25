import Entity from '../Entity';
import EntityCompanionProvider, {
  DatabaseAdapterFlavor,
  CacheAdapterFlavor,
  EntityCompanionDefinition,
} from '../EntityCompanionProvider';
import EntityConfiguration from '../EntityConfiguration';
import { StringField } from '../EntityFields';
import EntityPrivacyPolicy from '../EntityPrivacyPolicy';
import ViewerContext from '../ViewerContext';
import { createUnitTestEntityCompanionProvider } from '../utils/testing/createUnitTestEntityCompanionProvider';

type BlahFields = {
  hello: string;
};

const blahConfiguration = new EntityConfiguration<BlahFields>({
  idField: 'hello',
  tableName: 'wat',
  schema: {
    hello: new StringField({
      columnName: 'hello',
    }),
  },
  databaseAdaptorFlavor: DatabaseAdapterFlavor.POSTGRES,
  cacheAdaptorFlavor: CacheAdapterFlavor.REDIS,
});

class Blah1Entity extends Entity<BlahFields, string, ViewerContext> {
  static getCompanionDefinition(): EntityCompanionDefinition<
    BlahFields,
    string,
    ViewerContext,
    Blah1Entity,
    NoOpTest1PrivacyPolicy
  > {
    return blah1CompanionDefinition;
  }
}

class Blah2Entity extends Entity<BlahFields, string, ViewerContext> {
  static getCompanionDefinition(): EntityCompanionDefinition<
    BlahFields,
    string,
    ViewerContext,
    Blah2Entity,
    NoOpTest2PrivacyPolicy
  > {
    return blah2CompanionDefinition;
  }
}

class NoOpTest1PrivacyPolicy extends EntityPrivacyPolicy<
  BlahFields,
  string,
  ViewerContext,
  Blah1Entity
> {}
class NoOpTest2PrivacyPolicy extends EntityPrivacyPolicy<
  BlahFields,
  string,
  ViewerContext,
  Blah2Entity
> {}

const blah1CompanionDefinition = new EntityCompanionDefinition({
  entityClass: Blah1Entity,
  entityConfiguration: blahConfiguration,
  privacyPolicyClass: NoOpTest1PrivacyPolicy,
});

const blah2CompanionDefinition = new EntityCompanionDefinition({
  entityClass: Blah2Entity,
  entityConfiguration: blahConfiguration,
  privacyPolicyClass: NoOpTest2PrivacyPolicy,
});

describe(EntityCompanionProvider, () => {
  it('returns different instances for different entity types, but share table data coordinators', () => {
    const entityCompanionProvider = createUnitTestEntityCompanionProvider();
    const companion1 = entityCompanionProvider.getCompanionForEntity(
      Blah1Entity,
      blah1CompanionDefinition
    );

    const companion2 = entityCompanionProvider.getCompanionForEntity(
      Blah2Entity,
      blah2CompanionDefinition
    );

    expect(companion1).not.toEqual(companion2);
    expect(companion1['tableDataCoordinator']).toEqual(companion2['tableDataCoordinator']);
  });
});

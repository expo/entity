import { describe, expect, it } from '@jest/globals';

import { Entity } from '../Entity.ts';
import type { EntityCompanionDefinition } from '../EntityCompanionProvider.ts';
import { EntityCompanionProvider } from '../EntityCompanionProvider.ts';
import { EntityConfiguration } from '../EntityConfiguration.ts';
import { StringField } from '../EntityFields.ts';
import { EntityPrivacyPolicy } from '../EntityPrivacyPolicy.ts';
import type { ViewerContext } from '../ViewerContext.ts';
import { NoOpEntityMetricsAdapter } from '../metrics/NoOpEntityMetricsAdapter.ts';
import { InMemoryFullCacheStubCacheAdapterProvider } from '../utils/__testfixtures__/StubCacheAdapter.ts';
import { StubDatabaseAdapterProvider } from '../utils/__testfixtures__/StubDatabaseAdapterProvider.ts';
import { StubQueryContextProvider } from '../utils/__testfixtures__/StubQueryContextProvider.ts';
import { createUnitTestEntityCompanionProvider } from '../utils/__testfixtures__/createUnitTestEntityCompanionProvider.ts';

type BlahFields = {
  hello: string;
};

const blahConfiguration = new EntityConfiguration<BlahFields, 'hello'>({
  idField: 'hello',
  tableName: 'wat',
  schema: {
    hello: new StringField({
      columnName: 'hello',
      cache: false,
    }),
  },
  databaseAdapterFlavor: 'postgres',
  cacheAdapterFlavor: 'redis',
});

const blahOtherDatabaseConfiguration = new EntityConfiguration<BlahFields, 'hello'>({
  idField: 'hello',
  tableName: 'wat',
  schema: {
    hello: new StringField({
      columnName: 'hello',
      cache: false,
    }),
  },
  databaseAdapterFlavor: 'other-postgres',
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

class BlahOtherDatabaseEntity extends Entity<BlahFields, 'hello', ViewerContext> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    BlahFields,
    'hello',
    ViewerContext,
    BlahOtherDatabaseEntity,
    NoOpOtherDatabasePrivacyPolicy
  > {
    return {
      entityClass: BlahOtherDatabaseEntity,
      entityConfiguration: blahOtherDatabaseConfiguration,
      privacyPolicyClass: NoOpOtherDatabasePrivacyPolicy,
    };
  }
}

class NoOpOtherDatabasePrivacyPolicy extends EntityPrivacyPolicy<
  BlahFields,
  'hello',
  ViewerContext,
  BlahOtherDatabaseEntity
> {}

const DuplicateNameEntityOne = class DuplicateNameEntity extends Entity<
  BlahFields,
  'hello',
  ViewerContext
> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    BlahFields,
    'hello',
    ViewerContext,
    InstanceType<typeof DuplicateNameEntityOne>,
    DuplicateNamePrivacyPolicyOne
  > {
    return {
      entityClass: DuplicateNameEntityOne,
      entityConfiguration: blahConfiguration,
      privacyPolicyClass: DuplicateNamePrivacyPolicyOne,
    };
  }
};

const DuplicateNameEntityTwo = class DuplicateNameEntity extends Entity<
  BlahFields,
  'hello',
  ViewerContext
> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    BlahFields,
    'hello',
    ViewerContext,
    InstanceType<typeof DuplicateNameEntityTwo>,
    DuplicateNamePrivacyPolicyTwo
  > {
    return {
      entityClass: DuplicateNameEntityTwo,
      entityConfiguration: blahConfiguration,
      privacyPolicyClass: DuplicateNamePrivacyPolicyTwo,
    };
  }
};

class DuplicateNamePrivacyPolicyOne extends EntityPrivacyPolicy<
  BlahFields,
  'hello',
  ViewerContext,
  InstanceType<typeof DuplicateNameEntityOne>
> {}
class DuplicateNamePrivacyPolicyTwo extends EntityPrivacyPolicy<
  BlahFields,
  'hello',
  ViewerContext,
  InstanceType<typeof DuplicateNameEntityTwo>
> {}

describe(EntityCompanionProvider, () => {
  it('returns different instances for different entity types, but share table data coordinators', () => {
    const entityCompanionProvider = createUnitTestEntityCompanionProvider();
    const companion1 = entityCompanionProvider.getCompanionForEntity(Blah1Entity);
    const companion2 = entityCompanionProvider.getCompanionForEntity(Blah2Entity);
    expect(companion1).not.toEqual(companion2);
    expect(companion1['tableDataCoordinator']).toEqual(companion2['tableDataCoordinator']);
  });

  it('caches companions by class identity instead of class name', () => {
    expect(DuplicateNameEntityOne.name).toEqual(DuplicateNameEntityTwo.name);

    const entityCompanionProvider = createUnitTestEntityCompanionProvider();
    const companion1 = entityCompanionProvider.getCompanionForEntity(DuplicateNameEntityOne);
    const companion2 = entityCompanionProvider.getCompanionForEntity(DuplicateNameEntityTwo);

    expect(companion1).not.toEqual(companion2);
    expect(companion1.entityCompanionDefinition.entityClass).toBe(DuplicateNameEntityOne);
    expect(companion2.entityCompanionDefinition.entityClass).toBe(DuplicateNameEntityTwo);
  });

  it('does not share table data coordinators across database adapter flavors', () => {
    const entityCompanionProvider = new EntityCompanionProvider(
      new NoOpEntityMetricsAdapter(),
      new Map([
        [
          'postgres',
          {
            adapterProvider: new StubDatabaseAdapterProvider(),
            queryContextProvider: new StubQueryContextProvider(),
          },
        ],
        [
          'other-postgres',
          {
            adapterProvider: new StubDatabaseAdapterProvider(),
            queryContextProvider: new StubQueryContextProvider(),
          },
        ],
      ]),
      new Map([
        [
          'redis',
          {
            cacheAdapterProvider: new InMemoryFullCacheStubCacheAdapterProvider(),
          },
        ],
      ]),
    );

    const companion1 = entityCompanionProvider.getCompanionForEntity(Blah1Entity);
    const companion2 = entityCompanionProvider.getCompanionForEntity(BlahOtherDatabaseEntity);

    expect(companion1['tableDataCoordinator']).not.toEqual(companion2['tableDataCoordinator']);
  });
});

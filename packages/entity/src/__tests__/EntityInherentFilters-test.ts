import { describe, expect, it } from '@jest/globals';

import { Entity } from '../Entity.ts';
import type { EntityCompanionDefinition } from '../EntityCompanionProvider.ts';
import { EntityConfiguration } from '../EntityConfiguration.ts';
import { EntityEdgeDeletionBehavior } from '../EntityFieldDefinition.ts';
import { StringField, UUIDField } from '../EntityFields.ts';
import { EntityPrivacyPolicy } from '../EntityPrivacyPolicy.ts';
import { ViewerContext } from '../ViewerContext.ts';
import { AlwaysAllowPrivacyPolicyRule } from '../rules/AlwaysAllowPrivacyPolicyRule.ts';
import { createUnitTestEntityCompanionProvider } from '../utils/__testfixtures__/createUnitTestEntityCompanionProvider.ts';

// Two entity classes share a single `poly_children` table; each enforces a scope-specific
// constructor invariant. Each entity's configuration carries `inherentFilters` that scopes
// every load through that class to its own subset of rows.

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

interface ParentFields {
  id: string;
}

interface PolyChildFields {
  id: string;
  parent_id: string;
  scope: 'A' | 'B';
}

type EntityConstructorParams<
  TFields,
  TIDField extends keyof TFields,
  TSelectedFields extends keyof TFields = keyof TFields,
> = {
  viewerContext: ViewerContext;
  id: TFields[TIDField];
  databaseFields: Readonly<TFields>;
  selectedFields: Readonly<Pick<TFields, TSelectedFields>>;
};

class ParentEntity extends Entity<ParentFields, 'id', ViewerContext> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    ParentFields,
    'id',
    ViewerContext,
    ParentEntity,
    TestEntityPrivacyPolicy
  > {
    return {
      entityClass: ParentEntity,
      entityConfiguration: parentEntityConfiguration,
      privacyPolicyClass: TestEntityPrivacyPolicy,
    };
  }
}

class ScopeAChildEntity extends Entity<PolyChildFields, 'id', ViewerContext> {
  constructor(constructorParams: EntityConstructorParams<PolyChildFields, 'id'>) {
    if (constructorParams.databaseFields.scope !== 'A') {
      throw new Error(
        `ScopeAChildEntity requires scope='A', got '${constructorParams.databaseFields.scope}'`,
      );
    }
    super(constructorParams);
  }

  static defineCompanionDefinition(): EntityCompanionDefinition<
    PolyChildFields,
    'id',
    ViewerContext,
    ScopeAChildEntity,
    TestEntityPrivacyPolicy
  > {
    return {
      entityClass: ScopeAChildEntity,
      entityConfiguration: scopeAChildEntityConfiguration,
      privacyPolicyClass: TestEntityPrivacyPolicy,
    };
  }
}

class ScopeBChildEntity extends Entity<PolyChildFields, 'id', ViewerContext> {
  constructor(constructorParams: EntityConstructorParams<PolyChildFields, 'id'>) {
    if (constructorParams.databaseFields.scope !== 'B') {
      throw new Error(
        `ScopeBChildEntity requires scope='B', got '${constructorParams.databaseFields.scope}'`,
      );
    }
    super(constructorParams);
  }

  static defineCompanionDefinition(): EntityCompanionDefinition<
    PolyChildFields,
    'id',
    ViewerContext,
    ScopeBChildEntity,
    TestEntityPrivacyPolicy
  > {
    return {
      entityClass: ScopeBChildEntity,
      entityConfiguration: scopeBChildEntityConfiguration,
      privacyPolicyClass: TestEntityPrivacyPolicy,
    };
  }
}

const parentEntityConfiguration = new EntityConfiguration<ParentFields, 'id'>({
  idField: 'id',
  tableName: 'poly_parents',
  inboundEdges: [ScopeAChildEntity, ScopeBChildEntity],
  schema: {
    id: new UUIDField({ columnName: 'id', cache: true }),
  },
  databaseAdapterFlavor: 'postgres',
  cacheAdapterFlavor: 'redis',
});

const scopeAChildEntityConfiguration = new EntityConfiguration<PolyChildFields, 'id'>({
  idField: 'id',
  tableName: 'poly_children',
  inherentFilters: [{ fieldName: 'scope', fieldValue: 'A' }],
  schema: {
    id: new UUIDField({ columnName: 'id', cache: true }),
    parent_id: new UUIDField({
      columnName: 'parent_id',
      association: {
        associatedEntityClass: ParentEntity,
        edgeDeletionBehavior: EntityEdgeDeletionBehavior.CASCADE_DELETE,
      },
    }),
    scope: new StringField({ columnName: 'scope' }),
  },
  databaseAdapterFlavor: 'postgres',
  cacheAdapterFlavor: 'redis',
});

const scopeBChildEntityConfiguration = new EntityConfiguration<PolyChildFields, 'id'>({
  idField: 'id',
  tableName: 'poly_children',
  inherentFilters: [{ fieldName: 'scope', fieldValue: 'B' }],
  schema: {
    id: new UUIDField({ columnName: 'id', cache: true }),
    parent_id: new UUIDField({
      columnName: 'parent_id',
      association: {
        associatedEntityClass: ParentEntity,
        edgeDeletionBehavior: EntityEdgeDeletionBehavior.CASCADE_DELETE,
      },
    }),
    scope: new StringField({ columnName: 'scope' }),
  },
  databaseAdapterFlavor: 'postgres',
  cacheAdapterFlavor: 'redis',
});

describe('EntityConfiguration.inherentFilters', () => {
  it('loads by ID only when the row matches the inherent filter', async () => {
    const viewerContext = new ViewerContext(createUnitTestEntityCompanionProvider());
    const parent = await ParentEntity.creator(viewerContext).createAsync();
    const scopeARow = await ScopeAChildEntity.creator(viewerContext)
      .setField('parent_id', parent.getID())
      .setField('scope', 'A')
      .createAsync();
    const scopeBRow = await ScopeBChildEntity.creator(viewerContext)
      .setField('parent_id', parent.getID())
      .setField('scope', 'B')
      .createAsync();

    // Each row loads through its own class.
    await expect(
      ScopeAChildEntity.loader(viewerContext).loadByIDNullableAsync(scopeARow.getID()),
    ).resolves.not.toBeNull();
    await expect(
      ScopeBChildEntity.loader(viewerContext).loadByIDNullableAsync(scopeBRow.getID()),
    ).resolves.not.toBeNull();

    // Loading a wrong-scope row through the other class returns null (not a constructor
    // invariant throw) — the inherent filter excludes it at the SQL level.
    await expect(
      ScopeAChildEntity.loader(viewerContext).loadByIDNullableAsync(scopeBRow.getID()),
    ).resolves.toBeNull();
    await expect(
      ScopeBChildEntity.loader(viewerContext).loadByIDNullableAsync(scopeARow.getID()),
    ).resolves.toBeNull();
  });

  it('loadManyByFieldEqualingAsync only returns rows that match the inherent filter', async () => {
    const viewerContext = new ViewerContext(createUnitTestEntityCompanionProvider());
    const parent = await ParentEntity.creator(viewerContext).createAsync();
    const scopeARow1 = await ScopeAChildEntity.creator(viewerContext)
      .setField('parent_id', parent.getID())
      .setField('scope', 'A')
      .createAsync();
    const scopeARow2 = await ScopeAChildEntity.creator(viewerContext)
      .setField('parent_id', parent.getID())
      .setField('scope', 'A')
      .createAsync();
    await ScopeBChildEntity.creator(viewerContext)
      .setField('parent_id', parent.getID())
      .setField('scope', 'B')
      .createAsync();

    const scopeAResults = await ScopeAChildEntity.loader(
      viewerContext,
    ).loadManyByFieldEqualingAsync('parent_id', parent.getID());
    expect(scopeAResults.map((entity) => entity.getID()).sort()).toEqual(
      [scopeARow1.getID(), scopeARow2.getID()].sort(),
    );

    const scopeBResults = await ScopeBChildEntity.loader(
      viewerContext,
    ).loadManyByFieldEqualingAsync('parent_id', parent.getID());
    expect(scopeBResults).toHaveLength(1);
  });

  it("cascade-delete through inboundEdges only deletes rows that match each class's inherent filter", async () => {
    const viewerContext = new ViewerContext(createUnitTestEntityCompanionProvider());
    const parent = await ParentEntity.creator(viewerContext).createAsync();
    const scopeARow = await ScopeAChildEntity.creator(viewerContext)
      .setField('parent_id', parent.getID())
      .setField('scope', 'A')
      .createAsync();
    const scopeBRow = await ScopeBChildEntity.creator(viewerContext)
      .setField('parent_id', parent.getID())
      .setField('scope', 'B')
      .createAsync();

    // Cascade-deleting the parent must not trip either child class's scope invariant —
    // each class's cascade load is scoped by its own inherentFilters so it only ever sees
    // rows belonging to its scope.
    await ParentEntity.deleter(parent).deleteAsync();

    await expect(
      ScopeAChildEntity.loader(viewerContext).loadByIDNullableAsync(scopeARow.getID()),
    ).resolves.toBeNull();
    await expect(
      ScopeBChildEntity.loader(viewerContext).loadByIDNullableAsync(scopeBRow.getID()),
    ).resolves.toBeNull();
  });

  it('cascade-delete is a no-op for an inbound edge whose inherent filter matches no rows', async () => {
    const viewerContext = new ViewerContext(createUnitTestEntityCompanionProvider());
    const parent = await ParentEntity.creator(viewerContext).createAsync();
    // Only a scope-A row exists; the parent's ScopeB cascade load returns zero rows.
    const scopeARow = await ScopeAChildEntity.creator(viewerContext)
      .setField('parent_id', parent.getID())
      .setField('scope', 'A')
      .createAsync();

    await ParentEntity.deleter(parent).deleteAsync();

    await expect(
      ScopeAChildEntity.loader(viewerContext).loadByIDNullableAsync(scopeARow.getID()),
    ).resolves.toBeNull();
  });
});

import { EntityConfiguration } from '../../EntityConfiguration';
import {
  OrderByOrdering,
  TableFieldMultiValueEqualityCondition,
  TableFieldSingleValueEqualityCondition,
  TableQuerySelectionModifiers,
  TableQuerySelectionModifiersWithOrderByRaw,
} from '../../EntityDatabaseAdapter';
import { EntityKnexDatabaseAdapter } from '../../EntityKnexDatabaseAdapter';
import { FieldTransformerMap } from '../../internal/EntityFieldTransformationUtils';

export class StubKnexDatabaseAdapter<
  TFields extends Record<string, any>,
  TIDField extends keyof TFields,
> extends EntityKnexDatabaseAdapter<TFields, TIDField> {
  constructor(
    entityConfiguration: EntityConfiguration<TFields, TIDField>,
    fieldTransformerMap: FieldTransformerMap,
    private readonly dataStore: Map<string, Readonly<{ [key: string]: any }>[]>,
  ) {
    super(entityConfiguration, fieldTransformerMap);
  }

  private getObjectCollectionForTable(tableName: string): { [key: string]: any }[] {
    const objects = this.dataStore.get(tableName);
    return objects ? [...objects] : [];
  }

  private static compareByOrderBys(
    orderBys: {
      columnName: string;
      order: OrderByOrdering;
    }[],
    objectA: { [key: string]: any },
    objectB: { [key: string]: any },
  ): 0 | 1 | -1 {
    if (orderBys.length === 0) {
      return 0;
    }

    const currentOrderBy = orderBys[0]!;
    const aField = objectA[currentOrderBy.columnName];
    const bField = objectB[currentOrderBy.columnName];
    switch (currentOrderBy.order) {
      case OrderByOrdering.DESCENDING: {
        // simulate NULLS FIRST for DESC
        if (aField === null && bField === null) {
          return 0;
        } else if (aField === null) {
          return -1;
        } else if (bField === null) {
          return 1;
        }

        return aField > bField
          ? -1
          : aField < bField
            ? 1
            : this.compareByOrderBys(orderBys.slice(1), objectA, objectB);
      }
      case OrderByOrdering.ASCENDING: {
        // simulate NULLS LAST for ASC
        if (aField === null && bField === null) {
          return 0;
        } else if (bField === null) {
          return -1;
        } else if (aField === null) {
          return 1;
        }

        return bField > aField
          ? -1
          : bField < aField
            ? 1
            : this.compareByOrderBys(orderBys.slice(1), objectA, objectB);
      }
    }
  }

  protected async fetchManyByFieldEqualityConjunctionInternalAsync(
    _queryInterface: any,
    tableName: string,
    tableFieldSingleValueEqualityOperands: TableFieldSingleValueEqualityCondition[],
    tableFieldMultiValueEqualityOperands: TableFieldMultiValueEqualityCondition[],
    querySelectionModifiers: TableQuerySelectionModifiers,
  ): Promise<object[]> {
    let filteredObjects = this.getObjectCollectionForTable(tableName);
    for (const { tableField, tableValue } of tableFieldSingleValueEqualityOperands) {
      filteredObjects = filteredObjects.filter((obj) => obj[tableField] === tableValue);
    }

    for (const { tableField, tableValues } of tableFieldMultiValueEqualityOperands) {
      filteredObjects = filteredObjects.filter((obj) => tableValues.includes(obj[tableField]));
    }

    const orderBy = querySelectionModifiers.orderBy;
    if (orderBy !== undefined) {
      filteredObjects = filteredObjects.sort((a, b) =>
        StubKnexDatabaseAdapter.compareByOrderBys(orderBy, a, b),
      );
    }

    const offset = querySelectionModifiers.offset;
    if (offset !== undefined) {
      filteredObjects = filteredObjects.slice(offset);
    }

    const limit = querySelectionModifiers.limit;
    if (limit !== undefined) {
      filteredObjects = filteredObjects.slice(0, 0 + limit);
    }

    return filteredObjects;
  }

  protected fetchManyByRawWhereClauseInternalAsync(
    _queryInterface: any,
    _tableName: string,
    _rawWhereClause: string,
    _bindings: object | any[],
    _querySelectionModifiers: TableQuerySelectionModifiersWithOrderByRaw,
  ): Promise<object[]> {
    throw new Error('Raw WHERE clauses not supported for StubKnexDatabaseAdapter');
  }
}
import {
  EntityQueryContextProvider,
  TransactionConfig,
  TransactionIsolationLevel,
} from '@expo/entity';
import { Knex } from 'knex';

/**
 * Query context provider for knex (postgres).
 */
export default class PostgresEntityQueryContextProvider extends EntityQueryContextProvider {
  constructor(private readonly knexInstance: Knex) {
    super();
  }

  protected getQueryInterface(): any {
    return this.knexInstance;
  }

  protected createTransactionRunner<T>(
    transactionConfig?: TransactionConfig
  ): (transactionScope: (trx: any) => Promise<T>) => Promise<T> {
    return (transactionScope) =>
      this.knexInstance.transaction(
        transactionScope,
        transactionConfig
          ? PostgresEntityQueryContextProvider.convertTransactionConfig(transactionConfig)
          : undefined
      );
  }

  protected createNestedTransactionRunner<T>(
    outerQueryInterface: any,
    transactionConfig?: TransactionConfig
  ): (transactionScope: (queryInterface: any) => Promise<T>) => Promise<T> {
    return (transactionScope) =>
      (outerQueryInterface as Knex).transaction(
        transactionScope,
        transactionConfig
          ? PostgresEntityQueryContextProvider.convertTransactionConfig(transactionConfig)
          : undefined
      );
  }

  private static convertTransactionConfig(
    transactionConfig: TransactionConfig
  ): Knex.TransactionConfig {
    const convertIsolationLevel = (
      isolationLevel: TransactionIsolationLevel
    ): Knex.IsolationLevels => {
      switch (isolationLevel) {
        case TransactionIsolationLevel.READ_UNCOMMITTED:
          return 'read uncommitted';
        case TransactionIsolationLevel.READ_COMMITTED:
          return 'read committed';
        case TransactionIsolationLevel.SNAPSHOT:
          return 'snapshot';
        case TransactionIsolationLevel.REPEATABLE_READ:
          return 'repeatable read';
        case TransactionIsolationLevel.SERIALIZABLE:
          return 'serializable';
      }
    };

    return {
      ...(transactionConfig.isolationLevel
        ? { isolationLevel: convertIsolationLevel(transactionConfig.isolationLevel) }
        : {}),
    };
  }
}

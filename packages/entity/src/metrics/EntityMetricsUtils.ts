import IEntityMetricsAdapter, {
  EntityMetricsLoadType,
  EntityMetricsMutationType,
} from './IEntityMetricsAdapter';
import { EntityQueryContext } from '../EntityQueryContext';
import { IEntityLoadValue } from '../internal/EntityLoadInterfaces';
import { reduceMap } from '../utils/collections/maps';

export const timeAndLogLoadEventAsync =
  (
    metricsAdapter: IEntityMetricsAdapter,
    loadType: EntityMetricsLoadType,
    entityClassName: string,
    queryContext: EntityQueryContext,
  ) =>
  async <TFields>(promise: Promise<readonly Readonly<TFields>[]>) => {
    const startTime = Date.now();
    const result = await promise;
    const endTime = Date.now();

    metricsAdapter.logDataManagerLoadEvent({
      type: loadType,
      isInTransaction: queryContext.isInTransaction(),
      entityClassName,
      duration: endTime - startTime,
      count: result.length,
    });

    return result;
  };

export const timeAndLogLoadMapEventAsync =
  (
    metricsAdapter: IEntityMetricsAdapter,
    loadType: EntityMetricsLoadType,
    entityClassName: string,
    queryContext: EntityQueryContext,
  ) =>
  async <
    TFields extends Record<string, any>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(
    promise: Promise<ReadonlyMap<TLoadValue, readonly Readonly<TFields>[]>>,
  ) => {
    const startTime = Date.now();
    const result = await promise;
    const endTime = Date.now();

    const count = reduceMap(result, (acc, v) => acc + v.length, 0);

    metricsAdapter.logDataManagerLoadEvent({
      type: loadType,
      isInTransaction: queryContext.isInTransaction(),
      entityClassName,
      duration: endTime - startTime,
      count,
    });

    return result;
  };

export const timeAndLogMutationEventAsync =
  (
    metricsAdapter: IEntityMetricsAdapter,
    mutationType: EntityMetricsMutationType,
    entityClassName: string,
    queryContext: EntityQueryContext,
  ) =>
  async <T>(promise: Promise<T>) => {
    const startTime = Date.now();
    const result = await promise;
    const endTime = Date.now();

    metricsAdapter.logMutatorMutationEvent({
      type: mutationType,
      isInTransaction: queryContext.isInTransaction(),
      entityClassName,
      duration: endTime - startTime,
    });

    return result;
  };

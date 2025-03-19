import IEntityMetricsAdapter, {
  EntityMetricsLoadType,
  EntityMetricsMutationType,
} from './IEntityMetricsAdapter';
import { reduceMap } from '../utils/collections/maps';

export const timeAndLogLoadEventAsync =
  (
    metricsAdapter: IEntityMetricsAdapter,
    loadType: EntityMetricsLoadType,
    entityClassName: string,
  ) =>
  async <TFields>(promise: Promise<readonly Readonly<TFields>[]>) => {
    const startTime = Date.now();
    const result = await promise;
    const endTime = Date.now();

    metricsAdapter.logDataManagerLoadEvent({
      type: loadType,
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
  ) =>
  async <TFields, K, TMap extends ReadonlyMap<K, readonly Readonly<TFields>[]>>(
    promise: Promise<TMap>,
  ) => {
    const startTime = Date.now();
    const result = await promise;
    const endTime = Date.now();

    const count = reduceMap(result, (acc, v) => acc + v.length, 0);

    metricsAdapter.logDataManagerLoadEvent({
      type: loadType,
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
  ) =>
  async <T>(promise: Promise<T>) => {
    const startTime = Date.now();
    const result = await promise;
    const endTime = Date.now();

    metricsAdapter.logMutatorMutationEvent({
      type: mutationType,
      entityClassName,
      duration: endTime - startTime,
    });

    return result;
  };

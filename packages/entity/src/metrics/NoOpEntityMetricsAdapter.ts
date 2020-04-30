import IEntityMetricsAdapter, {
  EntityMetricsLoadEvent,
  EntityMetricsMutationEvent,
} from './IEntityMetricsAdapter';

export default class NoOpEntityMetricsAdapter implements IEntityMetricsAdapter {
  logDataManagerLoadEvent(_loadEvent: EntityMetricsLoadEvent): void {}
  logMutatorMutationEvent(_mutationEvent: EntityMetricsMutationEvent): void {}
  incrementDataManagerDataloaderLoadCount(_fieldValueCount: number): void {}
  incrementDataManagerCacheLoadCount(_fieldValueCount: number): void {}
  incrementDataManagerDatabaseLoadCount(_fieldValueCount: number): void {}
}

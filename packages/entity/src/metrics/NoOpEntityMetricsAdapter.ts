import IEntityMetricsAdapter, {
  EntityMetricsLoadEvent,
  EntityMetricsMutationEvent,
  IncrementLoadCountEvent,
} from './IEntityMetricsAdapter';

export default class NoOpEntityMetricsAdapter implements IEntityMetricsAdapter {
  logDataManagerLoadEvent(_loadEvent: EntityMetricsLoadEvent): void {}
  logMutatorMutationEvent(_mutationEvent: EntityMetricsMutationEvent): void {}
  incrementDataManagerDataloaderLoadCount(
    _incrementLoadCountEvent: IncrementLoadCountEvent
  ): void {}
  incrementDataManagerCacheLoadCount(_incrementLoadCountEvent: IncrementLoadCountEvent): void {}
  incrementDataManagerDatabaseLoadCount(_incrementLoadCountEvent: IncrementLoadCountEvent): void {}
}

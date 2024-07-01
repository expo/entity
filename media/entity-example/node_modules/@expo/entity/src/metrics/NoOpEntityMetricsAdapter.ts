import IEntityMetricsAdapter, {
  EntityMetricsAuthorizationEvent,
  EntityMetricsLoadEvent,
  EntityMetricsMutationEvent,
  IncrementLoadCountEvent,
} from './IEntityMetricsAdapter';

export default class NoOpEntityMetricsAdapter implements IEntityMetricsAdapter {
  logAuthorizationEvent(_authorizationEvent: EntityMetricsAuthorizationEvent): void {}
  logDataManagerLoadEvent(_loadEvent: EntityMetricsLoadEvent): void {}
  logMutatorMutationEvent(_mutationEvent: EntityMetricsMutationEvent): void {}
  incrementDataManagerLoadCount(_incrementLoadCountEvent: IncrementLoadCountEvent): void {}
}

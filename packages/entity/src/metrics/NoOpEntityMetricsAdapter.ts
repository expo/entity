import type {
  EntityMetricsAuthorizationEvent,
  EntityMetricsCountEvent,
  EntityMetricsLoadEvent,
  EntityMetricsMutationEvent,
  IEntityMetricsAdapter,
  IncrementLoadCountEvent,
} from './IEntityMetricsAdapter.ts';

export class NoOpEntityMetricsAdapter implements IEntityMetricsAdapter {
  logAuthorizationEvent(_authorizationEvent: EntityMetricsAuthorizationEvent): void {}
  logDataManagerLoadEvent(_loadEvent: EntityMetricsLoadEvent): void {}
  logDataManagerCountEvent(_countEvent: EntityMetricsCountEvent): void {}
  logMutatorMutationEvent(_mutationEvent: EntityMetricsMutationEvent): void {}
  incrementDataManagerLoadCount(_incrementLoadCountEvent: IncrementLoadCountEvent): void {}
}

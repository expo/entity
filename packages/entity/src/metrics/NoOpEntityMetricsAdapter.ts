import type {
  EntityMetricsAuthorizationEvent,
  EntityMetricsLoadEvent,
  EntityMetricsMutationEvent,
  IEntityMetricsAdapter,
  IncrementLoadCountEvent,
} from './IEntityMetricsAdapter.ts';

export class NoOpEntityMetricsAdapter implements IEntityMetricsAdapter {
  logAuthorizationEvent(_authorizationEvent: EntityMetricsAuthorizationEvent): void {}
  logDataManagerLoadEvent(_loadEvent: EntityMetricsLoadEvent): void {}
  logMutatorMutationEvent(_mutationEvent: EntityMetricsMutationEvent): void {}
  incrementDataManagerLoadCount(_incrementLoadCountEvent: IncrementLoadCountEvent): void {}
}

import type {
  EntityMetricsAuthorizationEvent,
  EntityMetricsLoadEvent,
  EntityMetricsMutationEvent,
  IEntityMetricsAdapter,
  IncrementLoadCountEvent,
  IncrementMutationCountEvent,
} from './IEntityMetricsAdapter.ts';

export class NoOpEntityMetricsAdapter implements IEntityMetricsAdapter {
  logAuthorizationEvent(_authorizationEvent: EntityMetricsAuthorizationEvent): void {}
  logDataManagerLoadEvent(_loadEvent: EntityMetricsLoadEvent): void {}
  logMutatorMutationEvent(_mutationEvent: EntityMetricsMutationEvent): void {}
  incrementDataManagerLoadCount(_incrementLoadCountEvent: IncrementLoadCountEvent): void {}
  incrementDataManagerMutationCount(
    _incrementMutationCountEvent: IncrementMutationCountEvent,
  ): void {}
}

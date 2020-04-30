export enum EntityMetricsLoadType {
  LOAD_MANY,
  LOAD_MANY_EQUALITY_CONJUNCTION,
  LOAD_MANY_RAW,
}

export interface EntityMetricsLoadEvent {
  type: EntityMetricsLoadType;
  duration: number;
  count: number;
}

export enum EntityMetricsMutationType {
  CREATE,
  UPDATE,
  DELETE,
}

export interface EntityMetricsMutationEvent {
  type: EntityMetricsMutationType;
  duration: number;
}

export default interface IEntityMetricsAdapter {
  /**
   * Called when any load occurs.
   * @param loadEvent info about the load event
   */
  logDataManagerLoadEvent(loadEvent: EntityMetricsLoadEvent): void;

  /**
   * Called when any mutation occurs.
   * @param mutationEvent info about the mutation event
   */
  logMutatorMutationEvent(mutationEvent: EntityMetricsMutationEvent): void;

  /**
   * Called when a dataloader load is initiated via the standard
   * load methods (not equality conjunction or raw).
   * @param fieldValueCount count of field values being loaded for a field
   */
  incrementDataManagerDataloaderLoadCount(fieldValueCount: number): void;

  /**
   * Called when a cache load is initiated via the standard
   * load methods (not equality conjunction or raw). Occurs upon a dataloader
   * miss.
   * @param fieldValueCount count of field values being loaded for a field
   */
  incrementDataManagerCacheLoadCount(fieldValueCount: number): void;

  /**
   * Called when a database load is initiated via the standard
   * load methods (not equality conjunction or raw). Occurs upon a cache
   * miss or when fetching an uncacheable field.
   * @param fieldValueCount count of field values being loaded for a field
   */
  incrementDataManagerDatabaseLoadCount(fieldValueCount: number): void;
}

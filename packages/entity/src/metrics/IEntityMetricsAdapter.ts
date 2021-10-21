import {
  EntityAuthorizationAction,
  EntityPrivacyPolicyEvaluationMode,
} from '../EntityPrivacyPolicy';

export enum EntityMetricsLoadType {
  LOAD_MANY,
  LOAD_MANY_EQUALITY_CONJUNCTION,
  LOAD_MANY_RAW,
}

export interface EntityMetricsLoadEvent {
  type: EntityMetricsLoadType;
  entityClassName: string;
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
  entityClassName: string;
  duration: number;
}

export interface IncrementLoadCountEvent {
  fieldValueCount: number;
  entityClassName: string;
}

export enum EntityMetricsAuthorizationResult {
  ALLOW,
  DENY,
}

export interface EntityMetricsAuthorizationEvent {
  entityClassName: string;
  action: EntityAuthorizationAction;
  evaluationResult: EntityMetricsAuthorizationResult;
  privacyPolicyEvaluationMode: EntityPrivacyPolicyEvaluationMode;
}

/**
 * An interface for gathering metrics about the Entity framework. Information about
 * entity load and mutation operations is piped to an instance of this adapter.
 */
export default interface IEntityMetricsAdapter {
  /**
   * Called when a {@link EntityPrivacyPolicy} authorization succeeds or fails.
   * @param authorizationEvent - info about the authorization event
   */
  logAuthorizationEvent(authorizationEvent: EntityMetricsAuthorizationEvent): void;

  /**
   * Called when any load occurs.
   * @param loadEvent - info about the load event
   */
  logDataManagerLoadEvent(loadEvent: EntityMetricsLoadEvent): void;

  /**
   * Called when any mutation occurs.
   * @param mutationEvent - info about the mutation event
   */
  logMutatorMutationEvent(mutationEvent: EntityMetricsMutationEvent): void;

  /**
   * Called when a dataloader load is initiated via the standard
   * load methods (not equality conjunction or raw).
   * @param fieldValueCount - count of field values being loaded for a field
   */
  incrementDataManagerDataloaderLoadCount(incrementLoadCountEvent: IncrementLoadCountEvent): void;

  /**
   * Called when a cache load is initiated via the standard
   * load methods (not equality conjunction or raw). Occurs upon a dataloader
   * miss.
   * @param fieldValueCount - count of field values being loaded for a field
   */
  incrementDataManagerCacheLoadCount(incrementLoadCountEvent: IncrementLoadCountEvent): void;

  /**
   * Called when a database load is initiated via the standard
   * load methods (not equality conjunction or raw). Occurs upon a cache
   * miss or when fetching an uncacheable field.
   * @param fieldValueCount - count of field values being loaded for a field
   */
  incrementDataManagerDatabaseLoadCount(incrementLoadCountEvent: IncrementLoadCountEvent): void;
}

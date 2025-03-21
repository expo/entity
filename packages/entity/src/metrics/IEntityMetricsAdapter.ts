import {
  EntityAuthorizationAction,
  EntityPrivacyPolicyEvaluationMode,
} from '../EntityPrivacyPolicy';
import { DataManagerLoadMethodType } from '../internal/EntityAdapterLoadInterfaces';

export enum EntityMetricsLoadType {
  LOAD_MANY,
  LOAD_MANY_EQUALITY_CONJUNCTION,
  LOAD_MANY_RAW,
  LOAD_MANY_COMPOSITE_KEY,
}

/**
 * Event about a single call to an EntityLoader method.
 */
export interface EntityMetricsLoadEvent {
  /**
   * EntityMetricsLoadType for this load.
   */
  type: EntityMetricsLoadType;

  /**
   * Class name of the Entity being loaded.
   */
  entityClassName: string;

  /**
   * Total duration of this load, including fetch and construction of entities.
   */
  duration: number;

  /**
   * Number of entities returned for this load.
   */
  count: number;
}

export enum EntityMetricsMutationType {
  CREATE,
  UPDATE,
  DELETE,
}

export interface EntityMetricsMutationEvent {
  /**
   * EntityMetricsMutationType for this mutation.
   */
  type: EntityMetricsMutationType;

  /**
   * Class name of the Entity being mutated.
   */
  entityClassName: string;

  /**
   * Total duration of this mutation.
   */
  duration: number;
}

export enum IncrementLoadCountEventType {
  /**
   * Type for when a dataloader load is initiated via the standard load methods
   * since all loads go through a dataloader.
   */
  DATALOADER,

  /**
   * Type for when a cache load is initiated due to a dataloader miss.
   */
  CACHE,

  /**
   * Type for when a database load is initiated due to a dataloader and cache miss, when an entity query doesn't support caching, or during a transaction.
   */
  DATABASE,
}

/**
 * Event used to record dataloader, cache, and database load counts in EntityDataManager.
 */
export interface IncrementLoadCountEvent {
  /**
   * Type of this event.
   */
  type: IncrementLoadCountEventType;

  /**
   * Load method type for this event.
   */
  loadType: DataManagerLoadMethodType;

  /**
   * Number of field values being loaded for this call.
   */
  fieldValueCount: number;

  /**
   * Class name of the Entity being loaded.
   */
  entityClassName: string;
}

export enum EntityMetricsAuthorizationResult {
  DENY,
  ALLOW,
}

/**
 * Event used to record a singe EntityPrivacyPolicy authorization.
 */
export interface EntityMetricsAuthorizationEvent {
  /**
   * Class name of the Entity being authorized.
   */
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
   * Called when a EntityPrivacyPolicy authorization succeeds or fails.
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
   * Called when a dataloader, cache, or database load is initiated via the standard
   * load methods (not equality conjunction or raw). Most commonly used for logging
   * a waterfall to determine dataloader and cache hit rates and ratios.
   * @param incrementLoadCountEvent - count of field values being loaded for a field
   */
  incrementDataManagerLoadCount(incrementLoadCountEvent: IncrementLoadCountEvent): void;
}

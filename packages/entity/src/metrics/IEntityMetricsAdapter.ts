import type {
  EntityAuthorizationAction,
  EntityPrivacyPolicyEvaluationMode,
} from '../EntityPrivacyPolicy.ts';
import type { EntityLoadMethodType } from '../internal/EntityLoadInterfaces.ts';

/**
 * The type of the load method being called.
 */
export enum EntityMetricsLoadType {
  /**
   * Standard EntityLoader load (the methods from EnforcingEntityLoader or AuthorizationResultBasedEntityLoader).
   */
  LOAD_MANY,
  /**
   * Knex loader load using loadManyByFieldEqualityConjunctionAsync.
   */
  LOAD_MANY_EQUALITY_CONJUNCTION,
  /**
   * Knex loader load using loadManyBySQL.
   */
  LOAD_MANY_SQL,
  /**
   * Internal data manager load via database adapter method loadOneEqualingAsync.
   */
  LOAD_ONE,
  /**
   * Knex loader load using loadPageAsync.
   */
  LOAD_PAGE,
  /**
   * Knex loader count using countBySQLAsync.
   */
  COUNT_SQL,
  /**
   * Knex loader count using countByFieldEqualityConjunctionAsync.
   */
  COUNT_EQUALITY_CONJUNCTION,
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
   * Whether this load is within a transaction.
   */
  isInTransaction: boolean;

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

/**
 * The type of mutation being performed.
 */
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
   * Whether this mutation is within a transaction.
   */
  isInTransaction: boolean;

  /**
   * Class name of the Entity being mutated.
   */
  entityClassName: string;

  /**
   * Total duration of this mutation.
   */
  duration: number;
}

/**
 * Type used to delineate dataloader, cache, and database load counts in EntityDataManager.
 */
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
   * Whether this load is within a transaction.
   */
  isInTransaction: boolean;

  /**
   * Load method type for this event.
   */
  loadType: EntityLoadMethodType;

  /**
   * Number of field values being loaded for this call.
   */
  fieldValueCount: number;

  /**
   * Class name of the Entity being loaded.
   */
  entityClassName: string;
}

/**
 * Type used to delineate batcher and database mutation counts in EntityMutationDataManager.
 */
export enum IncrementMutationCountEventType {
  /**
   * Type for when a mutation is submitted to the batcher.
   */
  BATCHER,

  /**
   * Type for when the batcher flushes mutations to the database adapter.
   */
  DATABASE,
}

/**
 * Event used to record batcher and database mutation counts in EntityMutationDataManager.
 */
export interface IncrementMutationCountEvent {
  /**
   * Type of this event.
   */
  type: IncrementMutationCountEventType;

  /**
   * The mutation type (CREATE, UPDATE, DELETE).
   */
  mutationType: EntityMetricsMutationType;

  /**
   * Class name of the Entity being mutated.
   */
  entityClassName: string;

  /**
   * Number of items in this batch/call.
   */
  itemCount: number;
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

  /**
   * The action being authorized.
   */
  action: EntityAuthorizationAction;

  /**
   * The result of the authorization.
   */
  evaluationResult: EntityMetricsAuthorizationResult;

  /**
   * The evaluation mode of the privacy policy.
   */
  privacyPolicyEvaluationMode: EntityPrivacyPolicyEvaluationMode;
}

/**
 * An interface for gathering metrics about the Entity framework. Information about
 * entity load and mutation operations is piped to an instance of this adapter.
 */
export interface IEntityMetricsAdapter {
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

  /**
   * Called when a batcher or database mutation is initiated via EntityMutationDataManager.
   * Most commonly used for logging a waterfall to determine batch effectiveness.
   * @param incrementMutationCountEvent - info about the mutation count event
   */
  incrementDataManagerMutationCount(incrementMutationCountEvent: IncrementMutationCountEvent): void;
}

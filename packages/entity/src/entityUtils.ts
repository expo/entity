import { Result, Success, Failure } from '@expo/results';

/**
 * Enforce an array of results resolved from supplied promise.
 * @param resultsPromise - promise returning an array of results to enforce
 */
export const enforceResultsAsync = async <T>(
  resultsPromise: Promise<readonly Result<T>[]>
): Promise<readonly T[]> => {
  const results = await resultsPromise;
  return results.map((result) => result.enforceValue());
};

/**
 * Filter out unsuccessful results.
 * @param results - array of results to filter
 */
export const successfulResults = <T>(results: readonly Result<T>[]): readonly Success<T>[] => {
  const ret: Success<T>[] = [];
  for (const result of results) {
    if (result.ok) {
      ret.push(result);
    }
  }
  return ret;
};

/**
 * Filter out successful results.
 * @param results - array of results to filter
 */
export const failedResults = <T>(results: readonly Result<T>[]): readonly Failure<T>[] => {
  const ret: Failure<T>[] = [];
  for (const result of results) {
    if (!result.ok) {
      ret.push(result);
    }
  }
  return ret;
};

/**
 * Filter out failed results from a map with result values.
 * @param results - map of results to filter.
 */
export const successfulResultsFilterMap = <K, T>(
  results: ReadonlyMap<K, Result<T>>
): ReadonlyMap<K, Success<T>> => {
  const ret: Map<K, Success<T>> = new Map();
  for (const [k, result] of results) {
    if (result.ok) {
      ret.set(k, result);
    }
  }
  return ret;
};

/**
 * Filter out successful results from a map with result values.
 * @param results - map of results to filter.
 */
export const failedResultsFilterMap = <K, T>(
  results: ReadonlyMap<K, Result<T>>
): ReadonlyMap<K, Failure<T>> => {
  const ret: Map<K, Failure<T>> = new Map();
  for (const [k, result] of results) {
    if (!result.ok) {
      ret.set(k, result);
    }
  }
  return ret;
};

/**
 * Partition array of values and errors into an array of values and an array of errors.
 * @param valuesAndErrors - array of values and errors
 */
export const partitionErrors = <T>(valuesAndErrors: (T | Error)[]): [T[], Error[]] => {
  const values: T[] = [];
  const errors: Error[] = [];

  for (const valueOrError of valuesAndErrors) {
    if (isError(valueOrError)) {
      errors.push(valueOrError);
    } else {
      values.push(valueOrError);
    }
  }

  return [values, errors];
};

const isError = <T>(value: T | Error): value is Error => {
  return value instanceof Error;
};

export const pick = <T extends object, U extends keyof T>(object: T, props: U[]): Pick<T, U> => {
  const propsSet = new Set(props);
  return Object.fromEntries(
    Object.entries(object).filter((entry) => propsSet.has(entry[0] as any))
  ) as any;
};

import { Result, Success, Failure } from '@expo/results';

export const enforceResultsAsync = async <T>(
  resultsPromise: Promise<readonly Result<T>[]>
): Promise<readonly T[]> => {
  const results = await resultsPromise;
  return results.map((result) => result.enforceValue());
};

export const successfulResults = <T>(results: readonly Result<T>[]): readonly Success<T>[] => {
  const ret: Success<T>[] = [];
  for (const result of results) {
    if (result.ok) {
      ret.push(result);
    }
  }
  return ret;
};

export const failedResults = <T>(results: readonly Result<T>[]): readonly Failure<T>[] => {
  const ret: Failure<T>[] = [];
  for (const result of results) {
    if (!result.ok) {
      ret.push(result);
    }
  }
  return ret;
};

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

export const partitionErrors = <T>(valuesOrErrors: (T | Error)[]): [T[], Error[]] => {
  const values: T[] = [];
  const errors: Error[] = [];

  for (const valueOrError of valuesOrErrors) {
    if (isError(valueOrError)) {
      errors.push(valueOrError);
    } else {
      values.push(valueOrError);
    }
  }

  return [values, errors];
};

export const isError = <T>(value: T | Error): value is Error => {
  return value instanceof Error;
};

/* c8 ignore start - types only */

export type NonNullableKeys<T> = {
  [K in keyof T]: T[K] extends NonNullable<T[K]> ? K : never;
}[keyof T];

export type PickNonNullable<T> = Pick<T, NonNullableKeys<T>>;

export type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;

/* c8 ignore stop - types only */

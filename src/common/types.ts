export type ReplaceValuesOfType<T, VFrom, VTo> = {
  [K in keyof T]: T[K] extends VFrom ? VTo : T[K];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type NullableRecordValues<T extends Record<PropertyKey, any>> = {
  [K in keyof T]-?: T[K] extends NonNullable<T[K]> ? T[K] : Exclude<T[K] | null, undefined>;
};

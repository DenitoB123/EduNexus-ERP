export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;
export type AnyRecord = Record<string, unknown>;
export type Constructor<T = unknown> = new (...args: unknown[]) => T;

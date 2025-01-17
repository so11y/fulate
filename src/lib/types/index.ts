export interface TypeFn<T, V> {
  (option: T): V;
  hFull(option: T): V;
}
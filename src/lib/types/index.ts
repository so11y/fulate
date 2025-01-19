export interface TypeFn<T, V> {
  (option: T): V;
  hFull(option: T): V;
}


export interface Rect {
  x: number, y: number, width: number, height: number
}
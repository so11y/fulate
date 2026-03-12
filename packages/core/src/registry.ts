const elementRegistry = new Map<string, new (options?: any) => any>();

export function registerElement(
  tag: string,
  Ctor: new (options?: any) => any
) {
  elementRegistry.set(tag, Ctor);
}

export function getElementCtor(
  tag: string
): (new (options?: any) => any) | undefined {
  return elementRegistry.get(tag);
}

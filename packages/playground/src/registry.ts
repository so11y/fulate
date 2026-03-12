export interface DemoEntry {
  title: string;
  setup: (
    el: HTMLElement,
    size: { width: number; height: number }
  ) => (() => void) | void | Promise<(() => void) | void>;
}

export const demos = new Map<string, DemoEntry>();

export function registerDemo(id: string, entry: DemoEntry) {
  demos.set(id, entry);
}

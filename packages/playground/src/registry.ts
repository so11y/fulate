export interface DemoEntry {
  title: string;
  group: string;
  order?: number;
  setup: (
    el: HTMLElement,
    size: { width: number; height: number }
  ) => (() => void) | void | Promise<(() => void) | void>;
}

export const demos = new Map<string, DemoEntry>();

export function registerDemo(id: string, entry: DemoEntry) {
  demos.set(id, entry);
}

export function getDemosByGroup(): Map<string, Array<{ id: string; entry: DemoEntry }>> {
  const groups = new Map<string, Array<{ id: string; entry: DemoEntry }>>();
  for (const [id, entry] of demos) {
    const group = entry.group;
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push({ id, entry });
  }
  for (const items of groups.values()) {
    items.sort((a, b) => (a.entry.order ?? 0) - (b.entry.order ?? 0));
  }
  return groups;
}

import type { Element } from "@fulate/core";
import { getElementCtor } from "@fulate/core";

const FILE_MARKER = "__fulate_file__";
const FILE_VERSION = 1;

export type ElementFilter = (element: Element) => boolean;
export type DeserializeFactory = (data: any) => Element | undefined;

export interface FileData {
  [key: string]: any;
  __fulate_file__: true;
  version: number;
  elements: any[];
}

function defaultFilter(_el: Element): boolean {
  return true;
}

// ─── deserialize plugin registry ────────────────────────────

const deserializePlugins = new Map<string, DeserializeFactory>();

export function registerDeserializePlugin(
  type: string,
  factory: DeserializeFactory
) {
  deserializePlugins.set(type, factory);
}

// ─── serialize ──────────────────────────────────────────────

export function serializeElements(
  elements: Element[],
  filter: ElementFilter = defaultFilter
): FileData {
  const filtered = elements.filter(filter);
  return {
    [FILE_MARKER]: true,
    version: FILE_VERSION,
    elements: filtered.map((el) => el.toJson(true)),
  };
}

export function serializeToJSON(
  elements: Element[],
  filter?: ElementFilter
): string {
  return JSON.stringify(serializeElements(elements, filter));
}

// ─── deserialize ────────────────────────────────────────────

export function deserializeElement(data: any): Element | undefined {
  const { type, children, ...props } = data;
  if (!type) return;

  const pluginFactory = deserializePlugins.get(type);
  if (pluginFactory) {
    delete props.key;
    return pluginFactory(data);
  }

  const tag = type.startsWith("f-") ? type : `f-${type}`;
  const Ctor = getElementCtor(tag);
  if (!Ctor) return;

  delete props.key;
  const el = new Ctor(props);

  if ((el as any)._initProps) {
    el.attrs((el as any)._initProps);
    (el as any)._initProps = null;
  }

  if (children?.length) {
    const deserialized = children
      .map((c: any) => deserializeElement(c))
      .filter(Boolean);
    if (el.type === "group") {
      (el as any)._pendingGroupEls = deserialized;
    } else {
      (el as any).children = deserialized;
    }
  }

  return el;
}

export function deserializeElements(
  data: any[],
  filter?: ElementFilter
): Element[] {
  const elements: Element[] = [];
  for (const item of data) {
    const el = deserializeElement(item);
    if (el && (!filter || filter(el))) {
      elements.push(el);
    }
  }
  return elements;
}

// ─── file data validation ───────────────────────────────────

export function isValidFileData(data: any): data is FileData {
  return (
    data != null &&
    data[FILE_MARKER] === true &&
    Array.isArray(data.elements)
  );
}

export function parseFileData(json: string): FileData | null {
  try {
    const data = JSON.parse(json);
    return isValidFileData(data) ? data : null;
  } catch {
    return null;
  }
}

// ─── export to file ─────────────────────────────────────────

export function exportToFile(
  elements: Element[],
  filename = "fulate-design.json",
  filter?: ElementFilter
) {
  const json = serializeToJSON(elements, filter);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── import from file ───────────────────────────────────────

export function importFromFile(
  filter?: ElementFilter
): Promise<Element[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve([]);
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const json = reader.result as string;
          const fileData = parseFileData(json);
          if (!fileData) return resolve([]);
          resolve(deserializeElements(fileData.elements, filter));
        } catch {
          resolve([]);
        }
      };
      reader.onerror = () => resolve([]);
      reader.readAsText(file);
    };
    input.click();
  });
}

// ─── import from JSON string ────────────────────────────────

export function importFromJSON(
  json: string,
  filter?: ElementFilter
): Element[] {
  const fileData = parseFileData(json);
  if (!fileData) return [];
  return deserializeElements(fileData.elements, filter);
}

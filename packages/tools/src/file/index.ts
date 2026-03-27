import type { Root, Element } from "@fulate/core";
import { getElementCtor } from "@fulate/core";

const FILE_MARKER = "__fulate_file__";
const FILE_VERSION = 1;

export type ElementFilter = (element: Element) => boolean;
export type DeserializeFactory = (data: any) => Element | undefined;

export interface FileData {
  [key: string]: any;
  __fulate_file__: true;
  version: number;
  children: any[];
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

export function serializeScene(
  root: Root,
  filter?: ElementFilter
): FileData {
  const all = (root.children ?? []) as unknown as Element[];
  const children = all
    .filter((c) => !filter || filter(c))
    .map((c) => c.toJson(true));

  return {
    [FILE_MARKER]: true,
    version: FILE_VERSION,
    children,
  };
}

export function serializeSceneToJSON(
  root: Root,
  filter?: ElementFilter
): string {
  return JSON.stringify(serializeScene(root, filter));
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

// ─── restore ────────────────────────────────────────────────

export function restoreScene(
  root: Root,
  fileData: FileData,
  filter?: ElementFilter
) {
  root.viewport.x = 0;
  root.viewport.y = 0;
  root.viewport.scale = 1;

  const select = root.find<any>("select");
  select?.history?.clear();

  const all = (root.children ?? []) as unknown as Element[];
  const toRemove = all.filter((c) => !filter || filter(c));
  if (toRemove.length) root.removeChild(...toRemove);

  const els = fileData.children
    .map((data: any) => deserializeElement(data))
    .filter(Boolean) as Element[];

  if (els.length) root.append(...els);

  root.requestRender();
}

// ─── file data validation ───────────────────────────────────

export function isValidFileData(data: any): data is FileData {
  return (
    data != null &&
    data[FILE_MARKER] === true &&
    Array.isArray(data.children)
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

// ─── export to file (download) ──────────────────────────────

export function exportToFile(
  root: Root,
  filename = "fulate-design.json",
  filter?: ElementFilter
) {
  const json = serializeSceneToJSON(root, filter);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── import from file (file picker) ─────────────────────────

export function importFromFile(
  root: Root,
  filter?: ElementFilter
): Promise<boolean> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(false);
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const fileData = parseFileData(reader.result as string);
          if (!fileData) return resolve(false);
          restoreScene(root, fileData, filter);
          resolve(true);
        } catch {
          resolve(false);
        }
      };
      reader.onerror = () => resolve(false);
      reader.readAsText(file);
    };
    input.click();
  });
}

import type { Artboard, Element } from "@fulate/core";
import { getElementCtor } from "@fulate/core";

const STORAGE_KEY = "fulate-editor-save";

function serializeArtboard(artboard: Artboard): string {
  const data = artboard.children
    .filter((c: any) => {
      const t = c.type;
      return t !== "select" && t !== "snap" && t !== "rule" && t !== "lineTool";
    })
    .map((c: any) => (c as Element).toJson(true));
  return JSON.stringify(data);
}

function deserializeElement(data: any): Element | undefined {
  const { type, children, ...props } = data;
  const tag = type.startsWith("f-") ? type : `f-${type}`;
  const Ctor = getElementCtor(tag);
  if (!Ctor) return;
  delete props.key;
  const el = new Ctor(props);
  if (children?.length) {
    for (const child of children) {
      const c = deserializeElement(child);
      if (c) (el as any).append(c);
    }
  }
  return el;
}

export function saveToStorage(artboard: Artboard) {
  const json = serializeArtboard(artboard);
  localStorage.setItem(STORAGE_KEY, json);
}

export function loadFromStorage(artboard: Artboard): boolean {
  const json = localStorage.getItem(STORAGE_KEY);
  if (!json) return false;
  try {
    const items = JSON.parse(json);
    if (!Array.isArray(items) || items.length === 0) return false;
    for (const data of items) {
      const el = deserializeElement(data);
      if (el) artboard.append(el);
    }
    return true;
  } catch {
    return false;
  }
}

export function clearStorage() {
  localStorage.removeItem(STORAGE_KEY);
}

export function exportToFile(artboard: Artboard) {
  const json = serializeArtboard(artboard);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "fulate-design.json";
  a.click();
  URL.revokeObjectURL(url);
}

export function importFromFile(artboard: Artboard): Promise<boolean> {
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
          const items = JSON.parse(reader.result as string);
          if (!Array.isArray(items)) return resolve(false);
          for (const data of items) {
            const el = deserializeElement(data);
            if (el) artboard.append(el);
          }
          resolve(true);
        } catch {
          resolve(false);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });
}

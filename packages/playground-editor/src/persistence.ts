import type { Artboard, Element } from "@fulate/core";
import {
  serializeToJSON,
  deserializeElements,
  exportToFile as toolsExportToFile,
  importFromFile as toolsImportFromFile,
  type ElementFilter,
} from "@fulate/tools";

const STORAGE_KEY = "fulate-editor-save";

const TOOLS_FILTER: ElementFilter = (el: Element) => {
  const t = el.type;
  return t !== "select" && t !== "snap" && t !== "rule" && t !== "lineTool";
};

export function saveToStorage(artboard: Artboard) {
  const json = serializeToJSON(artboard.children as Element[], TOOLS_FILTER);
  localStorage.setItem(STORAGE_KEY, json);
}

export function loadFromStorage(artboard: Artboard): boolean {
  const json = localStorage.getItem(STORAGE_KEY);
  if (!json) return false;
  try {
    const parsed = JSON.parse(json);
    const items = Array.isArray(parsed)
      ? parsed
      : parsed?.elements;
    if (!Array.isArray(items) || items.length === 0) return false;
    const els = deserializeElements(items);
    for (const el of els) artboard.append(el);
    return els.length > 0;
  } catch {
    return false;
  }
}

export function clearStorage() {
  localStorage.removeItem(STORAGE_KEY);
}

export function exportToFile(artboard: Artboard) {
  toolsExportToFile(artboard.children as Element[], "fulate-design.json", TOOLS_FILTER);
}

export async function importFromFile(artboard: Artboard): Promise<boolean> {
  const els = await toolsImportFromFile();
  for (const el of els) artboard.append(el);
  return els.length > 0;
}

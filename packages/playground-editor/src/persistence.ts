import type { Root, Element } from "@fulate/core";
import {
  serializeSceneToJSON,
  restoreScene,
  parseFileData,
  deserializeElement,
  exportToFile as toolsExportToFile,
  importFromFile as toolsImportFromFile,
  type ElementFilter,
} from "@fulate/tools";
import { importSketch } from "@fulate/import";

const STORAGE_KEY = "fulate-editor-save";

const CONTENT_FILTER: ElementFilter = (el: Element) => {
  const t = el.type;
  return t !== "editer-layer" && t !== "layer-overlay";
};

export { CONTENT_FILTER };

export function saveToStorage(root: Root) {
  const json = serializeSceneToJSON(root, CONTENT_FILTER);
  localStorage.setItem(STORAGE_KEY, json);
}

export function loadFromStorage(root: Root): boolean {
  const json = localStorage.getItem(STORAGE_KEY);
  if (!json) return false;
  const fileData = parseFileData(json);
  if (!fileData) return false;
  restoreScene(root, fileData, CONTENT_FILTER);
  return true;
}

export function clearStorage() {
  localStorage.removeItem(STORAGE_KEY);
}

export function exportToFile(root: Root) {
  toolsExportToFile(root, "fulate-design.json", CONTENT_FILTER);
}

export async function importFromFile(root: Root): Promise<boolean> {
  return toolsImportFromFile(root, CONTENT_FILTER);
}

export function importSketchFile(artboard: Element): Promise<boolean> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".sketch";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(false);
      try {
        const result = await importSketch(file);
        if (result.warnings.length) {
          console.warn("[Sketch Import]", result.warnings);
        }
        const els = result.fileData.children
          .map((data: any) => deserializeElement(data))
          .filter(Boolean);
        if (els.length) {
          (artboard as any).append(...els);
          (artboard as any).root?.requestRender();
        }
        resolve(els.length > 0);
      } catch (e) {
        console.error("[Sketch Import] failed:", e);
        resolve(false);
      }
    };
    input.click();
  });
}

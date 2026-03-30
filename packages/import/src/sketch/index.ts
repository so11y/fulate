import type { Root } from "@fulate/core";
import { Artboard } from "@fulate/core";
import { Workspace } from "@fulate/ui";
import type { Importer, ImportResult } from "../types";
import { parseSketchFile } from "./parser";
import { convertSketchToFileData } from "./converter";
import { restoreScene, pickFile } from "../util";
import type { ElementFilter, DeserializeFn } from "../util";

export class SketchImporter implements Importer {
  async import(file: File | ArrayBuffer): Promise<ImportResult> {
    return importSketch(file);
  }
}

export async function importSketch(
  file: File | ArrayBuffer
): Promise<ImportResult> {
  const sketch = await parseSketchFile(file);
  return convertSketchToFileData(sketch);
}

export async function importSketchFile(
  root: Root,
  deserialize: DeserializeFn,
  filter?: ElementFilter
): Promise<boolean> {
  const file = await pickFile(".sketch");
  if (!file) return false;

  try {
    const result = await importSketch(file);
    if (result.warnings.length) {
      console.warn("[Sketch Import]", result.warnings);
    }

    restoreScene({
      root,
      fileData: result.fileData,
      deserialize,
      filter,
      append: (els, root) => {
        const artboard = new Artboard();
        artboard.append(...els);
        const workspace = new Workspace({
          width: 1920,
          height: 1080,
          children: [artboard],
        });
        root.append(workspace);
      },
    });

    return result.fileData.children.length > 0;
  } catch (e) {
    console.error("[Sketch Import] failed:", e);
    return false;
  }
}

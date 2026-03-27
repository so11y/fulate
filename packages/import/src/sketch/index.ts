import type { Importer, ImportResult } from "../types";
import { parseSketchFile } from "./parser";
import { convertSketchToFileData } from "./converter";

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

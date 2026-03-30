import type { FileData } from "./fulate";

export interface ImportResult {
  fileData: FileData;
  /** imageRef → data URL */
  images: Map<string, string>;
  warnings: string[];
}

export interface Importer {
  import(file: File | ArrayBuffer): Promise<ImportResult>;
}

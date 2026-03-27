import { loadAsync, JSZipObject } from "jszip";
import type {
  SketchFile,
  SketchDocument,
  SketchMeta,
  SketchPage
} from "./types";
import * as JSZip from "jszip";

export async function parseSketchFile(
  data: File | ArrayBuffer
): Promise<SketchFile> {
  const buf = data instanceof File ? await data.arrayBuffer() : data;
  const zip = await loadAsync(buf);

  const document = await readJSON<SketchDocument>(zip, "document.json");
  const meta = await readJSON<SketchMeta>(zip, "meta.json");

  const pages: SketchPage[] = [];
  for (const ref of document.pages) {
    const pagePath = `${ref._ref}.json`;
    pages.push(await readJSON<SketchPage>(zip, pagePath));
  }

  const images = new Map<string, ArrayBuffer>();
  const imagesFolder = zip.folder("images");
  if (imagesFolder) {
    const entries: { name: string; file: JSZipObject }[] = [];
    imagesFolder.forEach((relativePath, file) => {
      if (!file.dir) entries.push({ name: relativePath, file });
    });
    for (const { name, file } of entries) {
      images.set(`images/${name}`, await file.async("arraybuffer"));
    }
  }

  return { document, meta, pages, images };
}

async function readJSON<T>(zip: JSZip, path: string): Promise<T> {
  const entry = zip.file(path);
  if (!entry) throw new Error(`Missing ${path} in sketch file`);
  const text = await entry.async("text");
  return JSON.parse(text);
}

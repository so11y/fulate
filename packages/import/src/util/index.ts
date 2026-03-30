import type { Root, Element } from "@fulate/core";
import type { FileData } from "../fulate";

export type ElementFilter = (element: Element) => boolean;

export type DeserializeFn = (data: any) => Element | undefined;

export interface RestoreOptions {
  root: Root;
  fileData: FileData;
  deserialize: DeserializeFn;
  /** 决定把反序列化后的元素添加到哪里、怎么添加 */
  append?: (els: Element[], root: Root) => void;
  /** 决定清除哪些旧元素，不传则不清除 */
  filter?: ElementFilter;
}

function defaultAppend(els: Element[], root: Root) {
  root.append(...els);
}

/**
 * 通用场景恢复模板：
 * 1. 应用 root 配置（resize、viewport、textDefaults）
 * 2. reset viewport / clear history
 * 3. 移除旧元素（由 filter 决定）
 * 4. 反序列化 children
 * 5. 添加新元素（由 append 决定）
 * 6. requestRender
 */
export function restoreScene(options: RestoreOptions) {
  const { root, fileData, deserialize, append = defaultAppend, filter } = options;

  if (fileData.root) {
    const { viewport, textDefaults, width, height } = fileData.root;
    if (textDefaults) Object.assign(root.textDefaults, textDefaults);
    if (width != null && height != null) {
      root.resize(width, height);
    }
    if (viewport) {
      if (viewport.minScale != null) root.viewport.minScale = viewport.minScale;
      if (viewport.maxScale != null) root.viewport.maxScale = viewport.maxScale;
    }
  }

  console.log("??");
  root.viewport.reset();

  const select = root.find<any>("select");
  select?.history?.clear();

  if (filter) {
    const all = (root.children ?? []) as unknown as Element[];
    const toRemove = all.filter((c) => filter(c));
    if (toRemove.length) root.removeChild(...toRemove);
  }

  const els = fileData.children
    .map((data: any) => deserialize(data))
    .filter(Boolean) as Element[];

  if (els.length) append(els, root);

  root.requestRender();
}

// ─── binary helpers ─────────────────────────────────────────

export function arrayBufferToDataURL(buf: ArrayBuffer, mime: string): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

export function guessMimeType(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    default:
      return "image/png";
  }
}

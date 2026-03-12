import type { Element } from "@fulate/core";
import { getElementCtor } from "@fulate/core";
import type { Select } from "./index";

const CLIPBOARD_MARKER = "__fulate_clipboard__";
const PASTE_OFFSET = 20;

function deserializeElement(data: any): Element | undefined {
  const { type, children, ...props } = data;
  const tag = type.startsWith("f-") ? type : `f-${type}`;
  const Ctor = getElementCtor(tag);
  if (!Ctor) return;
  delete props.key;
  const el = new Ctor(props);
  if (children?.length) {
    (el as any).children = children
      .map((c: any) => deserializeElement(c))
      .filter(Boolean);
  }
  return el;
}

function applyOffset(data: any, dx: number, dy: number) {
  if (data.left != null) data.left += dx;
  if (data.top != null) data.top += dy;
  if (data.linePoints) {
    for (const p of data.linePoints) {
      p.x += dx;
      p.y += dy;
    }
  }
}

function collectIds(el: Element): Set<string> {
  const ids = new Set<string>();
  ids.add(el.id);
  if (el.children) {
    for (const c of el.children) {
      for (const id of collectIds(c)) ids.add(id);
    }
  }
  return ids;
}

function remapAnchors(newEls: Element[], idMap: Map<string, string>) {
  for (const el of newEls) {
    const lp = (el as any).linePoints as
      | Array<{ anchor?: { elementId: string } }>
      | undefined;
    if (!lp) continue;
    for (const p of lp) {
      if (!p.anchor) continue;
      const newId = idMap.get(p.anchor.elementId);
      if (newId) {
        p.anchor.elementId = newId;
      } else {
        p.anchor = undefined;
      }
    }
  }
}

let memClipboard: Element[] | null = null;

export async function copyElements(select: Select) {
  if (!select.selectEls.length) return;

  memClipboard = [...select.selectEls];

  const data = {
    [CLIPBOARD_MARKER]: true,
    elements: select.selectEls.map((el) => ({
      type: el.type,
      id: el.id,
      props: el.toJson(true)
    }))
  };

  try {
    await navigator.clipboard.writeText(JSON.stringify(data));
  } catch {
    // 系统剪贴板不可用时静默降级，仍可同页粘贴
  }
}

export async function pasteElements(select: Select) {
  const offset = PASTE_OFFSET;

  if (memClipboard) {
    pasteFromMemory(select, memClipboard, offset);
    return;
  }

  try {
    const text = await navigator.clipboard.readText();
    const data = JSON.parse(text);
    if (!data?.[CLIPBOARD_MARKER]) return;
    pasteFromClipboardData(select, data.elements, offset);
  } catch {
    // 剪贴板为空或内容不合法
  }
}

function pasteFromMemory(select: Select, sources: Element[], offset: number) {
  const newEls: Element[] = [];
  const parents: any[] = [];
  const idMap = new Map<string, string>();

  const oldIds = new Set<string>();
  for (const src of sources) {
    for (const id of collectIds(src)) oldIds.add(id);
  }

  for (const src of sources) {
    const data = JSON.parse(JSON.stringify(src.toJson(true)));
    applyOffset(data, offset, offset);

    const clone = deserializeElement(data);
    if (!clone) continue;

    const layer = src.layer ?? select.root.layers[0];
    if (layer) {
      layer.append(clone);
      newEls.push(clone);
      parents.push(layer);
      idMap.set(src.id, clone.id);
    }
  }

  remapAnchors(newEls, idMap);
  commitPaste(select, newEls, parents);
}

function pasteFromClipboardData(
  select: Select,
  entries: { type: string; id?: string; props: any }[],
  offset: number
) {
  const newEls: Element[] = [];
  const parents: any[] = [];
  const idMap = new Map<string, string>();

  for (const entry of entries) {
    const data = { ...entry.props, type: entry.type };
    applyOffset(data, offset, offset);

    const el = deserializeElement(data);
    if (!el) continue;
    const layer = select.root.layers[0];
    if (layer) {
      layer.append(el);
      newEls.push(el);
      parents.push(layer);
      if (entry.id) idMap.set(entry.id, el.id);
    }
  }

  remapAnchors(newEls, idMap);
  commitPaste(select, newEls, parents);
}

function commitPaste(select: Select, newEls: Element[], parents: any[]) {
  if (!newEls.length) return;

  select.history.pushAction(
    () => {
      newEls.forEach((el) => el.parent?.removeChild(el));
      select.select([]);
    },
    () => {
      newEls.forEach((el, i) => {
        parents[i]?.append(el);
        el.markDirty();
      });
      select.root.nextTick(() => select.select(newEls));
    }
  );

  select.root.nextTick(() => select.select(newEls));
}

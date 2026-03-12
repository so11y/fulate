import type { Element } from "@fulate/core";
import { getElementCtor } from "@fulate/core";
import type { Select } from "./index";

const CLIPBOARD_MARKER = "__fulate_clipboard__";
const PASTE_OFFSET = 20;

let memClipboard: Element[] | null = null;

export async function copyElements(select: Select) {
  if (!select.selectEls.length) return;

  memClipboard = [...select.selectEls];

  const data = {
    [CLIPBOARD_MARKER]: true,
    elements: select.selectEls.map((el) => ({
      type: el.type,
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

  for (const src of sources) {
    const props = JSON.parse(JSON.stringify(src.toJson(true)));
    if (props.left != null) props.left += offset;
    if (props.top != null) props.top += offset;
    delete props.key;

    const clone = new (src.constructor as any)(props);
    const layer = src.layer ?? select.root.layers[0];
    if (layer) {
      layer.append(clone);
      newEls.push(clone);
      parents.push(layer);
    }
  }

  commitPaste(select, newEls, parents);
}

function pasteFromClipboardData(
  select: Select,
  entries: { type: string; props: any }[],
  offset: number
) {
  const newEls: Element[] = [];
  const parents: any[] = [];

  for (const entry of entries) {
    const Ctor = getElementCtor(entry.type);
    if (!Ctor) continue;

    const props = { ...entry.props };
    if (props.left != null) props.left += offset;
    if (props.top != null) props.top += offset;
    delete props.key;

    const el = new Ctor(props);
    const layer = select.root.layers[0];
    if (layer) {
      layer.append(el);
      newEls.push(el);
      parents.push(layer);
    }
  }

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

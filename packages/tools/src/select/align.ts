import type { Select } from "./index";
import type { Element } from "@fulate/core";

export type AlignType =
  | "justify-start"
  | "justify-center"
  | "justify-end"
  | "justify-between"
  | "align-start"
  | "align-center"
  | "align-end"
  | "align-between";

export function alignElements(select: Select, type: AlignType) {
  const els = select.selectEls;
  if (els.length < 2) return;

  select.history.snapshot(els);

  const rects = els.map((el) => ({ el, rect: el.getUnionBoundingRect() }));

  switch (type) {
    case "justify-start":
      justifyStart(rects);
      break;
    case "justify-center":
      justifyCenter(rects);
      break;
    case "justify-end":
      justifyEnd(rects);
      break;
    case "justify-between":
      justifyBetween(rects);
      break;
    case "align-start":
      alignStart(rects);
      break;
    case "align-center":
      alignCenter(rects);
      break;
    case "align-end":
      alignEnd(rects);
      break;
    case "align-between":
      alignBetween(rects);
      break;
  }

  select.select(els);
  select.history.commit();
}

type RectInfo = { el: Element; rect: { left: number; top: number; width: number; height: number } };

function justifyStart(rects: RectInfo[]) {
  const target = Math.min(...rects.map((r) => r.rect.left));
  for (const { el, rect } of rects) {
    el.setOptions({ left: el.left + (target - rect.left) });
  }
}

function justifyCenter(rects: RectInfo[]) {
  const minL = Math.min(...rects.map((r) => r.rect.left));
  const maxR = Math.max(...rects.map((r) => r.rect.left + r.rect.width));
  const center = (minL + maxR) / 2;
  for (const { el, rect } of rects) {
    el.setOptions({ left: el.left + (center - (rect.left + rect.width / 2)) });
  }
}

function justifyEnd(rects: RectInfo[]) {
  const target = Math.max(...rects.map((r) => r.rect.left + r.rect.width));
  for (const { el, rect } of rects) {
    el.setOptions({ left: el.left + (target - (rect.left + rect.width)) });
  }
}

function justifyBetween(rects: RectInfo[]) {
  if (rects.length < 3) return;
  rects.sort((a, b) => a.rect.left - b.rect.left);
  const first = rects[0].rect.left;
  const lastR = rects[rects.length - 1];
  const last = lastR.rect.left + lastR.rect.width;
  const totalWidth = rects.reduce((s, r) => s + r.rect.width, 0);
  const gap = (last - first - totalWidth) / (rects.length - 1);
  let x = first;
  for (const { el, rect } of rects) {
    el.setOptions({ left: el.left + (x - rect.left) });
    x += rect.width + gap;
  }
}

function alignStart(rects: RectInfo[]) {
  const target = Math.min(...rects.map((r) => r.rect.top));
  for (const { el, rect } of rects) {
    el.setOptions({ top: el.top + (target - rect.top) });
  }
}

function alignCenter(rects: RectInfo[]) {
  const minT = Math.min(...rects.map((r) => r.rect.top));
  const maxB = Math.max(...rects.map((r) => r.rect.top + r.rect.height));
  const center = (minT + maxB) / 2;
  for (const { el, rect } of rects) {
    el.setOptions({ top: el.top + (center - (rect.top + rect.height / 2)) });
  }
}

function alignEnd(rects: RectInfo[]) {
  const target = Math.max(...rects.map((r) => r.rect.top + r.rect.height));
  for (const { el, rect } of rects) {
    el.setOptions({ top: el.top + (target - (rect.top + rect.height)) });
  }
}

function alignBetween(rects: RectInfo[]) {
  if (rects.length < 3) return;
  rects.sort((a, b) => a.rect.top - b.rect.top);
  const first = rects[0].rect.top;
  const lastR = rects[rects.length - 1];
  const last = lastR.rect.top + lastR.rect.height;
  const totalHeight = rects.reduce((s, r) => s + r.rect.height, 0);
  const gap = (last - first - totalHeight) / (rects.length - 1);
  let y = first;
  for (const { el, rect } of rects) {
    el.setOptions({ top: el.top + (y - rect.top) });
    y += rect.height + gap;
  }
}

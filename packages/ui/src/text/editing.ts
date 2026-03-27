import { CustomEvent } from "@fulate/core";
import { Point } from "@fulate/util";
import { getMeasureContext, getCharWidth, measureStringWidth } from "./measure";
import type { Text, ResolvedTextStyle } from "./index";

const CARET_BLINK_MS = 530;
const SELECTION_COLOR = "rgba(66, 133, 244, 0.3)";

export { SELECTION_COLOR };

// ───────── helpers shared by editing & paint ─────────

export function getAlignOffsetX(
  width: number,
  lineText: string,
  ctx: CanvasRenderingContext2D,
  font: string,
  textAlign: string
): number {
  if (textAlign === "center") {
    return (width - measureStringWidth(ctx, lineText, font)) / 2;
  }
  if (textAlign === "right") {
    return width - measureStringWidth(ctx, lineText, font);
  }
  return 0;
}

export function getBlockVerticalOffset(
  height: number,
  textHeight: number,
  verticalAlign: string
): number {
  if (verticalAlign === "middle") {
    return (height - textHeight) / 2;
  }
  if (verticalAlign === "bottom") {
    return height - textHeight;
  }
  return 0;
}

export function getCaretLocalXY(
  self: Text,
  caretIndex: number
): { x: number; y: number; h: number } {
  const style = self.getResolvedTextStyle();
  const lineHeightPx = style.fontSize * style.lineHeight;
  const intraLine = (lineHeightPx - style.fontSize) / 2;
  const ctx = getMeasureContext();
  const font = self.getFontString(style);
  ctx.font = font;

  const lines = self._lines;
  const offsets = self._lineCharOffsets;

  if (lines.length === 0) {
    const bvo = getBlockVerticalOffset(self.height || 0, lineHeightPx, style.verticalAlign);
    return {
      x: getAlignOffsetX(self.width || 0, "", ctx, font, style.textAlign),
      y: bvo + intraLine,
      h: style.fontSize
    };
  }

  const bvo = getBlockVerticalOffset(self.height || 0, self._textHeight, style.verticalAlign);

  let lineIdx = 0;
  for (let i = 1; i < offsets.length; i++) {
    if (caretIndex >= offsets[i]) {
      lineIdx = i;
    } else {
      break;
    }
  }

  const lineStart = offsets[lineIdx] ?? 0;
  const charInLine = Math.min(caretIndex - lineStart, lines[lineIdx]?.length ?? 0);
  const lineText = lines[lineIdx] ?? "";
  const textBeforeCaret = lineText.slice(0, charInLine);
  const caretXInLine = measureStringWidth(ctx, textBeforeCaret, font);
  const alignX = getAlignOffsetX(self.width || 0, lineText, ctx, font, style.textAlign);

  return {
    x: alignX + caretXInLine,
    y: bvo + lineIdx * lineHeightPx + intraLine,
    h: style.fontSize
  };
}

function hitTestCaret(self: Text, localX: number, localY: number): number {
  const style = self.getResolvedTextStyle();
  const lineHeightPx = style.fontSize * style.lineHeight;
  const ctx = getMeasureContext();
  const font = self.getFontString(style);
  ctx.font = font;

  const lines = self._lines;
  const offsets = self._lineCharOffsets;

  if (lines.length === 0) return 0;

  const bvo = getBlockVerticalOffset(self.height || 0, self._textHeight, style.verticalAlign);
  let lineIdx = Math.floor((localY - bvo) / lineHeightPx);
  lineIdx = Math.max(0, Math.min(lineIdx, lines.length - 1));

  const line = lines[lineIdx];
  const lineOffset = offsets[lineIdx] ?? 0;
  const alignX = getAlignOffsetX(self.width || 0, line, ctx, font, style.textAlign);
  const relX = localX - alignX + self._scrollX;

  if (relX <= 0) return lineOffset;

  let accumulated = 0;
  for (let i = 0; i < line.length; i++) {
    const charW = getCharWidth(ctx, line[i], font);
    if (accumulated + charW / 2 >= relX) return lineOffset + i;
    accumulated += charW;
  }

  return lineOffset + line.length;
}

function ensureCaretVisible(self: Text) {
  if (!self._textarea) return;
  const style = self.getResolvedTextStyle();
  if (style.wordWrap) {
    self._scrollX = 0;
    return;
  }

  const ta = self._textarea;
  const activeIdx = ta.selectionDirection === "backward"
    ? (ta.selectionStart ?? 0)
    : (ta.selectionEnd ?? 0);
  const { x: caretX } = getCaretLocalXY(self, activeIdx);
  const w = self.width || 0;
  const margin = Math.min(w * 0.3, 50);

  if (caretX - self._scrollX < margin) {
    self._scrollX = Math.max(0, caretX - margin);
  } else if (caretX - self._scrollX > w - margin) {
    self._scrollX = caretX - w + margin;
  }
}

function updateTextareaPosition(self: Text) {
  const ta = self._textarea;
  if (!ta || !self.isActiveed) return;

  const root = self.root;
  if (!root) return;

  const { scale, x: vx, y: vy } = root.viewport;
  const m = (self as any)._ownMatrixCache;
  if (!m) return;

  const style = self.getResolvedTextStyle();
  const selStart = ta.selectionStart ?? self.text.length;
  const { x: cx, y: cy, h } = getCaretLocalXY(self, selStart);

  const screenX = (m.a * cx + m.c * cy + m.e) * scale + vx;
  const screenY = (m.b * cx + m.d * cy + m.f) * scale + vy;
  const sx = Math.sqrt(m.a * m.a + m.b * m.b);
  const screenH = h * sx * scale;

  ta.style.left = `${screenX}px`;
  ta.style.top = `${screenY}px`;
  ta.style.height = `${screenH}px`;
  ta.style.fontSize = `${style.fontSize * sx * scale}px`;
  ta.style.fontFamily = style.fontFamily;
}

function syncFromTextarea(self: Text) {
  if (!self._textarea) return;
  self.text = self._textarea.value;
  self.markNeedsLayout();
  ensureCaretVisible(self);
  updateTextareaPosition(self);
  self.dispatchEvent(
    new CustomEvent("input", { detail: self.text, bubbles: false })
  );
}

function restartBlink(self: Text) {
  stopBlink(self);
  self._caretVisible = true;
  self._blinkTimer = setInterval(() => {
    self._caretVisible = !self._caretVisible;
    self.markPaintDirty();
  }, CARET_BLINK_MS);
}

function stopBlink(self: Text) {
  if (self._blinkTimer !== null) {
    clearInterval(self._blinkTimer);
    self._blinkTimer = null;
  }
}

// ───────── public editing API ─────────

export function enterEditing(self: Text, initialClickLocal?: { x: number; y: number }) {
  if (!self.editable || self.isEditing) return;
  self.isEditing = true;

  const root = self.root;
  const abort = new AbortController();
  self._editAbort = abort;
  const { signal } = abort;

  const textarea = document.createElement("textarea");
  Object.assign(textarea.style, {
    position: "absolute",
    width: "1px",
    opacity: "0",
    overflow: "hidden",
    border: "none",
    outline: "none",
    resize: "none",
    padding: "0",
    margin: "0",
    zIndex: "9999",
    caretColor: "transparent",
    whiteSpace: "pre",
    pointerEvents: "none"
  });

  textarea.value = self.text;
  root.container.appendChild(textarea);
  self._textarea = textarea;
  self._scrollX = 0;
  updateTextareaPosition(self);

  let initialCaret = self.text.length;
  if (initialClickLocal) {
    initialCaret = hitTestCaret(self, initialClickLocal.x, initialClickLocal.y);
    self._selAnchor = initialCaret;
  }

  textarea.focus();
  textarea.setSelectionRange(initialCaret, initialCaret);
  restartBlink(self);
  ensureCaretVisible(self);

  textarea.addEventListener(
    "compositionstart",
    () => { self._composing = true; },
    { signal }
  );

  textarea.addEventListener(
    "compositionend",
    () => {
      self._composing = false;
      syncFromTextarea(self);
    },
    { signal }
  );

  textarea.addEventListener(
    "input",
    () => {
      if (self._composing) return;
      syncFromTextarea(self);
    },
    { signal }
  );

  textarea.addEventListener(
    "keydown",
    (e) => {
      e.stopPropagation();
      if (e.key === "Escape") { textarea.blur(); return; }
      if (e.key === "Enter" && !self.getResolvedTextStyle().wordWrap) {
        e.preventDefault();
        return;
      }
      requestAnimationFrame(() => {
        if (!self.isEditing) return;
        self._caretVisible = true;
        restartBlink(self);
        ensureCaretVisible(self);
        self.markNeedsLayout();
        updateTextareaPosition(self);
      });
    },
    { signal }
  );

  textarea.addEventListener("blur", () => {
    setTimeout(() => {
      if (self.isEditing && self._textarea && document.activeElement !== self._textarea) {
        exitEditing(self);
      }
    }, 0);
  }, { signal });

  root.container.addEventListener(
    "pointerdown",
    (e) => {
      if (!self.isEditing) return;
      e.preventDefault();
      const logicalPos = root.viewport.getLogicalPosition(e.clientX, e.clientY);
      if (self.hasPointHint(logicalPos)) {
        const localPoint = self.getGlobalToLocal(logicalPos);
        const caretIdx = hitTestCaret(self, localPoint.x, localPoint.y);
        self._selAnchor = caretIdx;
        textarea.focus({ preventScroll: true });
        textarea.setSelectionRange(caretIdx, caretIdx);
        self._caretVisible = true;
        restartBlink(self);
        ensureCaretVisible(self);
        self.markNeedsLayout();
        updateTextareaPosition(self);
      } else {
        exitEditing(self);
      }
    },
    { signal }
  );

  document.addEventListener(
    "pointermove",
    (e) => {
      if (self._selAnchor < 0 || !self.isEditing) return;
      const logicalPos = root.viewport.getLogicalPosition(e.clientX, e.clientY);
      const localPoint = self.getGlobalToLocal(logicalPos);
      const caretIdx = hitTestCaret(self, localPoint.x, localPoint.y);
      const start = Math.min(self._selAnchor, caretIdx);
      const end = Math.max(self._selAnchor, caretIdx);
      textarea.focus({ preventScroll: true });
      textarea.setSelectionRange(
        start,
        end,
        self._selAnchor <= caretIdx ? "forward" : "backward"
      );
      self._caretVisible = true;
      ensureCaretVisible(self);
      self.markNeedsLayout();
    },
    { signal }
  );

  document.addEventListener(
    "pointerup",
    () => { self._selAnchor = -1; },
    { signal }
  );

  document.addEventListener(
    "pointerdown",
    (e) => {
      if (!root.container.contains(e.target as Node)) {
        textarea.blur();
      }
    },
    { signal }
  );

  self.markNeedsLayout();
}

export function exitEditing(self: Text) {
  if (!self.isEditing) return;
  stopBlink(self);
  self._selAnchor = -1;
  self._scrollX = 0;
  if (self._textarea) {
    self.text = self._textarea.value;
    self._textarea.remove();
    self._textarea = null;
  }
  self._editAbort?.abort();
  self._editAbort = null;
  self.isEditing = false;
  self._composing = false;
  self.markNeedsLayout();
  self.dispatchEvent(
    new CustomEvent("change", { detail: self.text, bubbles: false })
  );
}

export function setupClickToEdit(self: Text): (() => void) | null {
  const root = self.root;
  const container = root?.container;
  if (!container) return null;
  const handler = (e: PointerEvent) => {
    if (!self.editable || self.isEditing || !self.isActiveed || !root) return;
    const logicalPos = root.viewport.getLogicalPosition(e.clientX, e.clientY);
    if (!self.hasPointHint(logicalPos)) return;
    e.preventDefault();
    const localPoint = self.getGlobalToLocal(logicalPos);
    self.enterEditing({ x: localPoint.x, y: localPoint.y });
  };
  container.addEventListener("pointerdown", handler);
  return () => container.removeEventListener("pointerdown", handler);
}

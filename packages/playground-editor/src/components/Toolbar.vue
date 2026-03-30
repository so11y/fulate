<script setup lang="ts">
import { computed } from "vue";
import { store, refreshSelection } from "../store";
import {
  saveToStorage,
  exportToFile,
  importFromFile,
  importSketchFile,
  clearStorage,
} from "../persistence";

const scalePercent = computed(() =>
  Math.round((store.viewportScale ?? 1) * 100)
);
const hasSelection = computed(() => store.selectedElements.length > 0);

function undo() {
  store.select?.history.undo();
  setTimeout(refreshSelection, 50);
}
function redo() {
  store.select?.history.redo();
  setTimeout(refreshSelection, 50);
}
function zoomIn() {
  store.root?.viewport.zoom(1.25);
}
function zoomOut() {
  store.root?.viewport.zoom(0.8);
}
function resetZoom() {
  store.root?.viewport.reset();
}
function save() {
  if (store.root) saveToStorage(store.root as any);
}
function doExport() {
  if (store.root) exportToFile(store.root as any);
}
async function doImport() {
  if (store.root) await importFromFile(store.root as any);
}
async function doImportSketch() {
  if (store.root) await importSketchFile(store.root as any);
}
function deleteSelected() {
  store.select?.delete();
  setTimeout(refreshSelection, 50);
}
function doGroup() {
  store.select?.doGroup();
  setTimeout(refreshSelection, 50);
}
function unGroup() {
  store.select?.unGroup();
  setTimeout(refreshSelection, 50);
}
function clearAll() {
  if (!confirm("确认清空画布？所有未保存的内容将丢失。")) return;
  if (store.artboard) {
    const children = [...store.artboard.children];
    children.forEach((c) => store.artboard!.removeChild(c as any));
    store.select?.select([]);
    clearStorage();
    refreshSelection();
  }
}
</script>

<template>
  <div class="toolbar">
    <div class="toolbar-group brand">
      <span class="toolbar-title">Fulate Editor</span>
    </div>

    <div class="toolbar-group">
      <button class="tb" @click="undo" title="撤销 (Ctrl+Z)">
        <span class="tb-icon">↩</span>
      </button>
      <button class="tb" @click="redo" title="重做 (Ctrl+Y)">
        <span class="tb-icon">↪</span>
      </button>
    </div>

    <div class="toolbar-group">
      <button class="tb" @click="deleteSelected" :disabled="!hasSelection" title="删除 (Delete)">
        <span class="tb-icon">🗑</span>
      </button>
      <button class="tb" @click="doGroup" :disabled="store.selectedElements.length < 2" title="组合 (Ctrl+G)">
        <span class="tb-label">组合</span>
      </button>
      <button class="tb" @click="unGroup" :disabled="store.selectedElements.length !== 1 ||
        store.selectedElements[0]?.type !== 'group'
        " title="取消组合 (Ctrl+Shift+G)">
        <span class="tb-label">拆分</span>
      </button>
    </div>

    <div class="toolbar-group">
      <button class="tb" @click="zoomOut" title="缩小">
        <span class="tb-icon">−</span>
      </button>
      <span class="zoom-label">{{ scalePercent }}%</span>
      <button class="tb" @click="zoomIn" title="放大">
        <span class="tb-icon">+</span>
      </button>
      <button class="tb" @click="resetZoom" title="重置视口">
        <span class="tb-label">1:1</span>
      </button>
    </div>

    <div class="toolbar-group right">
      <button class="tb accent" @click="save" title="保存到浏览器">
        <span class="tb-label">保存</span>
      </button>
      <button class="tb" @click="doExport" title="导出JSON">
        <span class="tb-label">导出</span>
      </button>
      <button class="tb" @click="doImport" title="导入JSON">
        <span class="tb-label">导入</span>
      </button>
      <button class="tb sketch" @click="doImportSketch" title="导入Sketch文件">
        <span class="tb-label">Sketch</span>
      </button>
      <button class="tb danger" @click="clearAll" title="清空画布">
        <span class="tb-label">清空</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  height: 44px;
  background: #fff;
  border-bottom: 1px solid #ddd;
  display: flex;
  align-items: center;
  padding: 0 8px;
  gap: 2px;
  flex-shrink: 0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.toolbar-title {
  font-weight: 700;
  font-size: 15px;
  color: #1a73e8;
  letter-spacing: -0.3px;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 8px;
  border-right: 1px solid #eee;
}

.toolbar-group.brand {
  padding-right: 16px;
}

.toolbar-group.right {
  margin-left: auto;
  border-right: none;
}

.toolbar-group:last-child {
  border-right: none;
}

.tb {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5px 8px;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.12s;
  color: #444;
  gap: 4px;
  min-height: 30px;
}

.tb:hover {
  background: #f0f0f0;
  border-color: #e0e0e0;
}

.tb:active {
  background: #e4e4e4;
}

.tb:disabled {
  opacity: 0.35;
  cursor: default;
  pointer-events: none;
}

.tb.accent {
  background: #e8f0fe;
  color: #1a73e8;
  font-weight: 600;
}

.tb.accent:hover {
  background: #d2e3fc;
}

.tb.sketch {
  background: #fff4e5;
  color: #e8850c;
  font-weight: 600;
}

.tb.sketch:hover {
  background: #ffe8cc;
}

.tb.danger {
  color: #d93025;
}

.tb.danger:hover {
  background: #fce8e6;
}

.tb-icon {
  font-size: 16px;
  line-height: 1;
}

.tb-label {
  font-size: 12px;
}

.zoom-label {
  font-size: 12px;
  color: #666;
  min-width: 42px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
</style>

<script setup lang="ts">
const elements = [
  { type: "rectangle", label: "矩形", icon: "▭" },
  { type: "circle", label: "圆形", icon: "○" },
  { type: "triangle", label: "三角形", icon: "△" },
  { type: "polygon", label: "多边形", icon: "⬠" },
  { type: "text", label: "文本", icon: "T" },
  { type: "image", label: "图片", icon: "🖼" },
  { type: "customer", label: "自定义", icon: "🤔" },
];

function onDragStart(e: DragEvent, type: string) {
  e.dataTransfer!.setData("element-type", type);
  e.dataTransfer!.effectAllowed = "copy";
}
</script>

<template>
  <div class="sidebar">
    <div class="section">
      <div class="section-title">基础元素</div>
      <div
        v-for="el in elements"
        :key="el.type"
        class="drag-item"
        draggable="true"
        @dragstart="onDragStart($event, el.type)"
      >
        <span class="item-icon">{{ el.icon }}</span>
        <span class="item-label">{{ el.label }}</span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">快捷键</div>
      <div class="shortcut-list">
        <div class="shortcut-row">
          <span class="key">Space + 拖动</span>
          <span class="desc">平移画布</span>
        </div>
        <div class="shortcut-row">
          <span class="key">滚轮</span>
          <span class="desc">缩放画布</span>
        </div>
        <div class="shortcut-row">
          <span class="key">Ctrl+G</span>
          <span class="desc">组合</span>
        </div>
        <div class="shortcut-row">
          <span class="key">Ctrl+Shift+G</span>
          <span class="desc">取消组合</span>
        </div>
        <div class="shortcut-row">
          <span class="key">Ctrl+C / V</span>
          <span class="desc">复制 / 粘贴</span>
        </div>
        <div class="shortcut-row">
          <span class="key">Ctrl+Z / Y</span>
          <span class="desc">撤销 / 重做</span>
        </div>
        <div class="shortcut-row">
          <span class="key">Delete</span>
          <span class="desc">删除</span>
        </div>
        <div class="shortcut-row">
          <span class="key">Escape</span>
          <span class="desc">取消选择</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sidebar {
  width: 200px;
  background: #fafafa;
  border-right: 1px solid #e0e0e0;
  padding: 0;
  overflow-y: auto;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}
.section {
  padding: 12px;
  border-bottom: 1px solid #eee;
}
.section-title {
  font-size: 11px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
  font-weight: 600;
}
.drag-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  margin: 3px 0;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 6px;
  cursor: grab;
  font-size: 13px;
  transition: all 0.15s;
  user-select: none;
}
.drag-item:hover {
  border-color: #bbb;
  background: #f0f4ff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
.drag-item:active {
  cursor: grabbing;
  transform: scale(0.97);
}
.item-icon {
  font-size: 18px;
  width: 26px;
  text-align: center;
  color: #555;
}
.item-label {
  color: #333;
}
.shortcut-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.shortcut-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  padding: 2px 0;
}
.shortcut-row .key {
  color: #666;
  font-family: monospace;
  font-size: 10px;
  background: #f0f0f0;
  padding: 1px 4px;
  border-radius: 3px;
  border: 1px solid #ddd;
}
.shortcut-row .desc {
  color: #999;
}
</style>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import { store, refreshSelection } from "../store";

const visible = computed(() => store.contextMenu.visible);
const x = computed(() => store.contextMenu.x);
const y = computed(() => store.contextMenu.y);

const hasSelection = computed(() => store.selectedElements.length > 0);
const isMulti = computed(() => store.selectedElements.length >= 2);
const isGroup = computed(
  () =>
    store.selectedElements.length === 1 &&
    store.selectedElements[0]?.type === "group"
);

function hide() {
  store.contextMenu.visible = false;
}

function act(fn: () => void) {
  fn();
  hide();
  setTimeout(refreshSelection, 50);
}

interface MenuItem {
  label: string;
  shortcut?: string;
  action: () => void;
  disabled: boolean;
  divider?: boolean;
}

const items = computed<MenuItem[]>(() => [
  {
    label: "复制",
    shortcut: "Ctrl+C",
    action: () => store.select?.copy(),
    disabled: !hasSelection.value,
  },
  {
    label: "粘贴",
    shortcut: "Ctrl+V",
    action: () => store.select?.paste(),
    disabled: false,
  },
  {
    label: "删除",
    shortcut: "Delete",
    action: () => store.select?.delete(),
    disabled: !hasSelection.value,
    divider: true,
  },
  {
    label: "组合",
    shortcut: "Ctrl+G",
    action: () => store.select?.doGroup(),
    disabled: !isMulti.value,
  },
  {
    label: "取消组合",
    shortcut: "Ctrl+Shift+G",
    action: () => store.select?.unGroup(),
    disabled: !isGroup.value,
    divider: true,
  },
  {
    label: "左对齐",
    action: () => store.select?.align("justify-start" as any),
    disabled: !isMulti.value,
  },
  {
    label: "水平居中",
    action: () => store.select?.align("justify-center" as any),
    disabled: !isMulti.value,
  },
  {
    label: "右对齐",
    action: () => store.select?.align("justify-end" as any),
    disabled: !isMulti.value,
  },
  {
    label: "顶对齐",
    action: () => store.select?.align("align-start" as any),
    disabled: !isMulti.value,
  },
  {
    label: "底对齐",
    action: () => store.select?.align("align-end" as any),
    disabled: !isMulti.value,
    divider: true,
  },
  {
    label: "撤销",
    shortcut: "Ctrl+Z",
    action: () => store.select?.history.undo(),
    disabled: false,
  },
  {
    label: "重做",
    shortcut: "Ctrl+Y",
    action: () => store.select?.history.redo(),
    disabled: false,
  },
]);

function onClickOutside() {
  if (visible.value) hide();
}

onMounted(() => {
  document.addEventListener("pointerdown", onClickOutside);
});
onUnmounted(() => {
  document.removeEventListener("pointerdown", onClickOutside);
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="ctx-menu"
      :style="{ left: x + 'px', top: y + 'px' }"
      @pointerdown.stop
    >
      <template v-for="(item, i) in items" :key="i">
        <div
          class="ctx-item"
          :class="{ disabled: item.disabled }"
          @click="!item.disabled && act(item.action)"
        >
          <span class="ctx-label">{{ item.label }}</span>
          <span v-if="item.shortcut" class="ctx-shortcut">{{
            item.shortcut
          }}</span>
        </div>
        <div v-if="item.divider" class="ctx-divider" />
      </template>
    </div>
  </Teleport>
</template>

<style scoped>
.ctx-menu {
  position: fixed;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 4px 0;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.14);
  z-index: 10000;
  min-width: 200px;
  animation: ctx-fade-in 0.1s ease-out;
}

@keyframes ctx-fade-in {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.ctx-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 7px 14px;
  cursor: pointer;
  font-size: 13px;
  color: #333;
  transition: background 0.08s;
}
.ctx-item:hover {
  background: #f0f4ff;
}
.ctx-item.disabled {
  color: #bbb;
  pointer-events: none;
}
.ctx-label {
  flex: 1;
}
.ctx-shortcut {
  color: #999;
  font-size: 11px;
  margin-left: 24px;
  font-family: system-ui;
}
.ctx-divider {
  height: 1px;
  background: #eee;
  margin: 4px 8px;
}
</style>

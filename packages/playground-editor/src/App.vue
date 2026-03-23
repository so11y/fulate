<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { initEditor, addElementToCanvas } from "./editor";
import Sidebar from "./components/Sidebar.vue";
import Toolbar from "./components/Toolbar.vue";
import PropertyPanel from "./components/PropertyPanel.vue";
import ContextMenu from "./components/ContextMenu.vue";

const canvasRef = ref<HTMLElement>();
let cleanup: (() => void) | null = null;

onMounted(() => {
  if (canvasRef.value) {
    cleanup = initEditor(canvasRef.value);
  }
});

onUnmounted(() => cleanup?.());

function onDragOver(e: DragEvent) {
  e.preventDefault();
  e.dataTransfer!.dropEffect = "copy";
}

function onDrop(e: DragEvent) {
  e.preventDefault();
  const type = e.dataTransfer!.getData("element-type");
  if (type) {
    addElementToCanvas(type, e.clientX, e.clientY);
  }
}
</script>

<template>
  <div class="app">
    <Toolbar />
    <div class="workspace">
      <Sidebar />
      <div
        class="canvas-wrapper"
        ref="canvasRef"
        @dragover="onDragOver"
        @drop="onDrop"
      ></div>
      <PropertyPanel />
    </div>
    <ContextMenu />
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
body {
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  overflow: hidden;
}
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: #f0f0f0;
}
.workspace {
  flex: 1;
  display: flex;
  overflow: hidden;
}
.canvas-wrapper {
  flex: 1;
  background: #e0e0e0;
  position: relative;
}
</style>

import.meta.glob("./demos/*.{ts,tsx}", { eager: true });

import { demos, getDemosByGroup } from "./registry";

let currentCleanup: (() => void) | null = null;

function getAppEl(): HTMLElement {
  return document.getElementById("app")!;
}

function getContainerSize() {
  const container = document.getElementById("canvas-container")!;
  return { width: container.clientWidth, height: container.clientHeight };
}

function buildSidebar() {
  const sidebar = document.getElementById("sidebar")!;
  const groups = getDemosByGroup();

  let html = '<h2>Fulate Playground</h2>';
  for (const [group, items] of groups) {
    html += `<div class="group-title">${group}</div>`;
    for (const { id, entry } of items) {
      html += `<a href="#${id}">${entry.title}</a>`;
    }
  }
  sidebar.innerHTML = html;
}

function clearCanvas() {
  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }
  getAppEl().innerHTML = "";
}

async function loadDemo(id: string) {
  const entry = demos.get(id);
  if (!entry) {
    console.warn(`Demo "${id}" not found`);
    return;
  }

  clearCanvas();
  document.getElementById("demo-title")!.textContent = entry.title;

  document.querySelectorAll("#sidebar a").forEach((a) => {
    a.classList.toggle("active", a.getAttribute("href") === `#${id}`);
  });

  try {
    const { width, height } = getContainerSize();
    const cleanup = await entry.setup(getAppEl(), { width, height });
    if (cleanup) currentCleanup = cleanup;
  } catch (e) {
    console.error(`Demo "${id}" failed:`, e);
    getAppEl().innerHTML = `<div style="padding:24px;color:#e74c3c;">Demo 加载失败，请查看控制台</div>`;
  }
}

// FPS counter
let lastTime = performance.now();
let frames = 0;
const fpsEl = document.getElementById("fps")!;
function updateFPS() {
  frames++;
  const now = performance.now();
  if (now >= lastTime + 1000) {
    fpsEl.textContent = `FPS: ${Math.round((frames * 1000) / (now - lastTime))}`;
    frames = 0;
    lastTime = now;
  }
  requestAnimationFrame(updateFPS);
}

buildSidebar();
updateFPS();

function onHashChange() {
  const id = location.hash.slice(1) || "basic";
  loadDemo(id);
}

window.addEventListener("hashchange", onHashChange);
onHashChange();

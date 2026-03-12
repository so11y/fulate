import "./demos/basic";
import "./demos/interaction";
import "./demos/animation";
import "./demos/nesting";
import "./demos/flex";
import "./demos/scrollview";
import "./demos/vue-basic";
import "./demos/vue-reactive";
import "./demos/vue-transition";

import { demos } from "./registry";

let currentCleanup: (() => void) | null = null;

function getAppEl(): HTMLElement {
  return document.getElementById("app")!;
}

function clearCanvas() {
  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }
  const app = getAppEl();
  app.innerHTML = "";
}

function getContainerSize() {
  const container = document.getElementById("canvas-container")!;
  return { width: container.clientWidth, height: container.clientHeight };
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

  const { width, height } = getContainerSize();
  const cleanup = await entry.setup(getAppEl(), { width, height });
  if (cleanup) currentCleanup = cleanup;
}

function onHashChange() {
  const id = location.hash.slice(1) || "basic";
  loadDemo(id);
}

window.addEventListener("hashchange", onHashChange);

onHashChange();

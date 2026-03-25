import { registerDemo } from "../registry";
import { Root, Layer, EditerLayer, Artboard } from "@fulate/core";
import { Rectangle, Text, Workspace } from "@fulate/ui";
import { Select, Snap, LineTool } from "@fulate/tools";

// ========== 布局算法 ==========

interface MindmapData {
  id: string;
  name: string;
  width?: number;
  height?: number;
  children?: MindmapData[];
}

interface LayoutNode {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  children: LayoutNode[];
  parent?: LayoutNode;
}

type Direction = "right" | "left" | "down" | "up";

const H_GAP = 60;
const V_GAP = 24;

function buildLayoutTree(
  data: MindmapData,
  depth = 0,
  parent?: LayoutNode
): LayoutNode {
  const node: LayoutNode = {
    id: data.id,
    name: data.name,
    x: 0,
    y: 0,
    width: data.width ?? Math.max(data.name.length * 14 + 32, 100),
    height: data.height ?? 44,
    depth,
    children: [],
    parent
  };
  if (data.children) {
    node.children = data.children.map((c) =>
      buildLayoutTree(c, depth + 1, node)
    );
  }
  return node;
}

/**
 * 横向布局（right / left 共用）：父在左/右，子向右/左展开。
 * 返回该子树占用的总高度。
 */
function layoutHorizontal(node: LayoutNode, x: number, y: number): number {
  node.x = x;
  node.y = y;
  if (!node.children.length) return node.height;

  const childX = x + node.width + H_GAP;
  let childY = y;
  let totalH = 0;

  for (const child of node.children) {
    const h = layoutHorizontal(child, childX, childY);
    childY += h + V_GAP;
    totalH += h + V_GAP;
  }
  totalH -= V_GAP;
  node.y = y + (totalH - node.height) / 2;
  return Math.max(totalH, node.height);
}

/**
 * 纵向布局（down / up 共用）：父在上/下，子向下/上展开。
 * 返回该子树占用的总宽度。
 */
function layoutVertical(node: LayoutNode, x: number, y: number): number {
  node.x = x;
  node.y = y;
  if (!node.children.length) return node.width;

  const childY = y + node.height + V_GAP;
  let childX = x;
  let totalW = 0;

  for (const child of node.children) {
    const w = layoutVertical(child, childX, childY);
    childX += w + H_GAP;
    totalW += w + H_GAP;
  }
  totalW -= H_GAP;
  node.x = x + (totalW - node.width) / 2;
  return Math.max(totalW, node.width);
}

/**
 * 镜像变换：将所有节点沿某轴翻转。
 * 用于从 "right" 布局得到 "left"，从 "down" 得到 "up"。
 */
function mirror(
  nodes: LayoutNode[],
  axis: "x" | "y",
  origin: number
) {
  for (const n of nodes) {
    if (axis === "x") {
      n.x = origin - (n.x - origin) - n.width;
    } else {
      n.y = origin - (n.y - origin) - n.height;
    }
  }
}

function collect(node: LayoutNode): LayoutNode[] {
  const result: LayoutNode[] = [node];
  for (const child of node.children) {
    result.push(...collect(child));
  }
  return result;
}

function doLayout(tree: LayoutNode, dir: Direction, startX: number, startY: number) {
  if (dir === "right" || dir === "left") {
    layoutHorizontal(tree, startX, startY);
  } else {
    layoutVertical(tree, startX, startY);
  }

  const all = collect(tree);

  if (dir === "left") {
    mirror(all, "x", startX);
  } else if (dir === "up") {
    mirror(all, "y", startY);
  }
}

type AnchorEdge = "top" | "right" | "bottom" | "left";

function getAnchors(
  dir: Direction,
  hasParent: boolean,
  hasChildren: boolean
) {
  const anchors: { id: string; label: string; edge: AnchorEdge }[] = [];

  const parentEdge: Record<Direction, AnchorEdge> = {
    right: "left",
    left: "right",
    down: "top",
    up: "bottom"
  };
  const childEdge: Record<Direction, AnchorEdge> = {
    right: "right",
    left: "left",
    down: "bottom",
    up: "top"
  };

  if (hasParent) anchors.push({ id: "in", label: "入", edge: parentEdge[dir] });
  if (hasChildren) anchors.push({ id: "out", label: "出", edge: childEdge[dir] });

  return anchors;
}

// ========== Demo ==========

const COLORS = [
  "#3498db",
  "#e74c3c",
  "#2ecc71",
  "#9b59b6",
  "#f39c12",
  "#1abc9c",
  "#e67e22",
  "#34495e"
];

const MINDMAP_DATA: MindmapData = {
  id: "root",
  name: "Fulate 引擎",
  children: [
    {
      id: "core",
      name: "核心 Core",
      children: [
        { id: "node", name: "节点系统" },
        { id: "layer", name: "Layer 图层" },
        { id: "root-vp", name: "Root 视口" }
      ]
    },
    {
      id: "ui",
      name: "UI 图形",
      children: [
        { id: "rect", name: "Rectangle" },
        { id: "text-el", name: "Text" },
        { id: "line-el", name: "Line" }
      ]
    },
    {
      id: "tools",
      name: "编辑工具",
      children: [
        { id: "select", name: "Select 选择" },
        { id: "snap", name: "Snap 吸附" },
        { id: "history", name: "History 历史" }
      ]
    },
    {
      id: "ext",
      name: "扩展",
      children: [
        { id: "yoga", name: "Yoga Flex" },
        { id: "vue", name: "Vue 集成" },
        { id: "echart", name: "ECharts" }
      ]
    }
  ]
};

registerDemo("mindmap", {
  title: "脑图布局",
  group: "布局",
  order: 0,
  setup(el, { width, height }) {
    const root = new Root(el, { width, height });

    let direction: Direction = "right";
    let nodeElements: Rectangle[] = [];

    function createNodes(dir: Direction): Rectangle[] {
      const tree = buildLayoutTree(MINDMAP_DATA);
      doLayout(tree, dir, 200, 200);

      const flat = collect(tree);
      const elements: Rectangle[] = [];

      for (const n of flat) {
        const color = COLORS[n.depth % COLORS.length];
        const rect = new Rectangle({
          left: n.x,
          top: n.y,
          width: n.width,
          height: n.height,
          backgroundColor: color,
          radius: 8,
          anchors: getAnchors(dir, n.depth > 0, n.children.length > 0),
          children: [
            new Text({
              text: n.name,
              textAlign: "center",
              verticalAlign: "middle",
              color: "#fff",
              fontSize: 13,
              silent: true,
              pickable: false
            })
          ]
        });
        elements.push(rect);
      }
      return elements;
    }

    nodeElements = createNodes(direction);

    const hint = new Text({
      left: 20,
      top: 20,
      width: 600,
      height: 40,
      text: "按 L 进入画线模式，点击锚点连线 | 下方按钮切换布局方向",
      color: "#666",
      fontSize: 12,
      silent: true,
      pickable: false
    });

    const artboard = new Artboard({
      children: [hint, ...nodeElements]
    });

    const workspace = new Workspace({
      width: 1920,
      height: 1080,
      children: [artboard]
    });

    const contentLayer = new Layer({
      zIndex: 1,
      enableDirtyRect: true,
      children: [workspace]
    });

    const editerLayer = new EditerLayer({
      zIndex: 2,
      children: [new Select(), new Snap(), new LineTool()]
    });

    root.append(contentLayer, editerLayer);
    root.mount();

    const btnContainer = document.createElement("div");
    btnContainer.style.cssText =
      "position:absolute;bottom:20px;left:20px;display:flex;gap:8px;z-index:10;";

    const makeBtn = (text: string, active: boolean, onClick: () => void) => {
      const btn = document.createElement("button");
      btn.textContent = text;
      btn.dataset.dir = text;
      btn.style.cssText =
        "padding:6px 14px;border:1px solid #ccc;border-radius:6px;" +
        `background:${active ? "#3498db" : "#fff"};color:${active ? "#fff" : "#333"};` +
        "cursor:pointer;font-size:12px;transition:all .2s;";
      btn.addEventListener("click", onClick);
      btnContainer.appendChild(btn);
      return btn;
    };

    const rebuild = (dir: Direction) => {
      direction = dir;
      for (const node of nodeElements) artboard.removeChild(node);
      nodeElements = createNodes(dir);
      artboard.append(...nodeElements);

      btnContainer.querySelectorAll("button").forEach((btn) => {
        const isActive = btn.dataset.dir === dirLabels[dir];
        btn.style.background = isActive ? "#3498db" : "#fff";
        btn.style.color = isActive ? "#fff" : "#333";
      });
    };

    const dirLabels: Record<Direction, string> = {
      right: "→ 向右",
      left: "← 向左",
      down: "↓ 向下",
      up: "↑ 向上"
    };

    for (const dir of ["right", "left", "down", "up"] as Direction[]) {
      makeBtn(dirLabels[dir], dir === direction, () => rebuild(dir));
    }

    el.appendChild(btnContainer);

    return () => root.unmounted();
  }
});

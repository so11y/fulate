# Fulate

一个高性能、可扩展的 **2D Canvas 渲染引擎**，采用 monorepo 架构，提供从底层渲染到上层编辑器的完整能力栈。支持 Vue 组件嵌入、Flex 布局、ECharts 图表、Material Design 3 组件等，适合搭建图形编辑器、设计工具、数据可视化平台。

## 特性

- **高性能渲染** — 脏矩形更新、RBush 空间索引，轻松承载 10 万+ 节点
- **多层级节点系统** — 树形结构，支持嵌套组合、透明度继承、阴影等
- **完整变换能力** — 平移、缩放、旋转、斜切，矩阵分解与坐标系转换
- **编辑工具集** — 选择框、控制点、吸附对齐、标尺、历史记录、剪贴板
- **Flex 布局** — 基于 yoga-layout，在 Canvas 中使用 Flexbox
- **Vue 集成** — 在 Canvas 节点中嵌入 Vue 组件，支持响应式和过渡动画
- **ECharts 集成** — Worker 池离屏渲染，主线程零阻塞
- **MD3 组件库** — Button、Input、Select、Radio、Checkbox、Switch 等开箱即用

## 快速开始

```bash
npm install
npm run playground
```

浏览器访问后，通过左侧菜单切换不同 Demo 体验各项能力。

## 包结构

| 包 | 说明 |
|---|---|
| **@fulate/util** | 基础工具：几何计算、矩阵变换、颜色处理、事件系统 |
| **@fulate/core** | 核心引擎：节点树、Layer 图层、Root 视口、命中检测、动画调度 |
| **@fulate/ui** | 基础图形：Rectangle、Circle、Triangle、Text、Image、Line、ScrollView、Group |
| **@fulate/yoga** | Flex 布局：基于 yoga-layout 的 Div / Span 容器 |
| **@fulate/tools** | 编辑工具：Select 选择、Snap 吸附、Rule 标尺、History 历史、对齐、剪贴板 |
| **@fulate/echart** | ECharts 集成：Worker 池 + 离屏 Canvas，以 Shape 形式嵌入画布 |
| **@fulate/vue** | Vue 集成：VueShape 在 Canvas 中挂载 Vue 应用，支持 provide/inject |
| **@fulate/components** | MD3 组件：Button、Input、Select、Radio、Checkbox、Switch、Tooltip |
| **@fulate/playground** | 演示应用：聚合所有包，提供交互式 Demo |

### 依赖关系

```
util (基础层)
 ├── core (渲染引擎)
 │    ├── ui (基础图形)
 │    │    ├── tools (编辑工具)
 │    │    ├── yoga (Flex 布局)
 │    │    │    └── vue (Vue 集成)
 │    │    │         └── components (MD3 组件)
 │    │    └── echart (图表)
 │    └───────────────────────────
 └── playground (聚合演示)
```

## 核心概念

**Node** — 所有节点的基类，提供树结构、provide/inject、脏标记、挂载/卸载生命周期

**Element** — 可渲染节点，带 AABB 包围盒和 RBush 空间索引

**Layer** — Canvas 图层，管理脏矩形更新和 Tween 动画

**Root** — 画布根节点，统一管理视口变换（平移/缩放）、事件分发、命中检测

**VueShape** — 特殊 Shape，激活时挂载 Vue 应用，支持完整 Vue 生态

## License

MIT

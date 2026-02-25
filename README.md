# fulate

一个现代化、可扩展的 2D 画布编辑引擎，支持多层级节点、变换、选择、标尺、对齐、交互等功能，适合搭建图形编辑器、设计工具、可视化平台等。

## 特性

- 🖼️ 多层级节点系统，支持嵌套、组合
- 🔄 支持平移、缩放、旋转、斜切等变换
- 🟦 支持选择框、控制点、拖拽缩放/旋转
- 📏 标尺（Ruler）支持智能刻度、尺寸显示、选区高亮
- 🖱️ 事件系统，支持自定义交互、快捷键、鼠标操作
- ⚡ 高性能渲染，适配大画布和复杂场景
- 🧩 易于扩展，适合二次开发

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发环境
npm run dev

# 构建生产包
npm run build
```

## 主要模块说明

### Transformable

- 所有可变换节点的基类，支持平移、缩放、旋转、斜切、原点设置等。
- 提供 getOwnMatrix、getCoords、getBoundingRect、containsPoint 等核心方法。

### Select

- 选择框与控制点逻辑，支持多选、拖拽、缩放、旋转。
- 控制点位置自动适配变换，支持自定义控制柄。

### Rule

- 标尺组件，支持智能刻度、尺寸显示、选区高亮。
- 能实时反映 select 框的旋转和尺寸。

### Layer & Root

- Layer 支持多层渲染，Root 作为画布根节点，统一管理视口、事件、渲染等。

## 事件与交互

- 支持 pointer、mouse、keyboard 等事件，支持自定义事件分发。
- 支持空格+拖拽平移、滚轮缩放、点击/拖拽选择、控制点缩放/旋转等。

## 扩展与自定义

- 可继承 Transformable、Element 等基类自定义节点。
- 可扩展 Layer、Rule、Select 等功能模块。

## 示例

## 在线体验

点击 [stackblitz](https://stackblitz.com/github/so11y/fulate?file=src%2Fmain.ts).

## 贡献

欢迎 issue、PR、建议和二次开发！

## License

MIT

import { registerDemo } from "../registry";
import { Root } from "@fulate/core";
import { createApp } from "@fulate/vue";
import { defineComponent, ref, reactive } from "@vue/runtime-core";

const App = defineComponent({
  setup() {
    const colors = ["#e74c3c", "#f39c12", "#2ecc71", "#3498db", "#9b59b6"];
    let colorIdx = 0;

    const color = ref("#e74c3c");
    const posX = ref(100);

    const items = reactive([
      { id: 1, x: 100, y: 200, color: "#3498db", size: 70 },
      { id: 2, x: 200, y: 200, color: "#2ecc71", size: 70 },
      { id: 3, x: 300, y: 200, color: "#9b59b6", size: 70 },
    ]);

    let nextId = 4;

    function handleClick() {
      colorIdx = (colorIdx + 1) % colors.length;
      color.value = colors[colorIdx];
      posX.value += 30;
      if (posX.value > 500) posX.value = 100;
    }

    function handleItemClick(item: (typeof items)[0]) {
      item.size = item.size >= 100 ? 50 : item.size + 10;
      item.color = colors[Math.floor(Math.random() * colors.length)];
    }

    function addItem() {
      items.push({
        id: nextId++,
        x: 100 + (items.length % 5) * 100,
        y: 200 + Math.floor(items.length / 5) * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 50 + Math.floor(Math.random() * 40),
      });
    }

    return () => (
      <f-workspace width={1920} height={900}>
        <f-artboard>
          <f-text
            left={60} top={20} width={500} height={36}
            text="点击红色矩形改变颜色和位置 | 点击下方矩形改变大小 | 点击绿色按钮添加"
            color="#333" verticalAlign="middle"
          />

          <f-rectangle
            left={posX.value} top={80} width={100} height={100}
            backgroundColor={color.value} radius={12}
            onClick={handleClick}
          />

          {items.map((item) => (
            <f-rectangle
              key={item.id}
              left={item.x} top={item.y}
              width={item.size} height={item.size}
              backgroundColor={item.color} radius={6}
              onClick={() => handleItemClick(item)}
            />
          ))}

          <f-rectangle
            left={550} top={80} width={80} height={40}
            backgroundColor="#27ae60" radius={6}
          >
            <f-text
              width={80} height={40}
              text="+ 添加" color="#fff"
              textAlign="center" verticalAlign="middle"
              onClick={addItem}
            />
          </f-rectangle>
        </f-artboard>
      </f-workspace>
    );
  },
});

registerDemo("vue-reactive", {
  title: "Vue 响应式",
  group: "Vue",
  order: 2,
  setup(el, { width, height }) {
    const root = new Root(el, { width, height });
    createApp(App).mount(root);
    return () => root.unmounted();
  },
});

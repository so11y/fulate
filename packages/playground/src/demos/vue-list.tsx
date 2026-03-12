import { registerDemo } from "../registry";
import { Root } from "@fulate/core";
import { createApp } from "@fulate/vue";
import { defineComponent, ref, computed, reactive } from "@vue/runtime-core";

const COLORS = ["#e74c3c", "#3498db", "#2ecc71", "#9b59b6", "#f39c12", "#1abc9c", "#e67e22", "#34495e"];

const App = defineComponent({
  setup() {
    let nextId = 1;
    function makeItem() {
      const id = nextId++;
      return {
        id,
        label: `Item ${id}`,
        color: COLORS[(id - 1) % COLORS.length],
      };
    }

    const items = reactive(Array.from({ length: 6 }, makeItem));
    const sortAsc = ref(true);

    const sorted = computed(() => {
      const arr = [...items];
      arr.sort((a, b) => (sortAsc.value ? a.id - b.id : b.id - a.id));
      return arr;
    });

    function addItem() {
      items.push(makeItem());
    }

    function removeItem(id: number) {
      const idx = items.findIndex((i) => i.id === id);
      if (idx !== -1) items.splice(idx, 1);
    }

    return () => (
      <f-workspace width={1920} height={900}>
        <f-artboard>
          <f-text
            left={60} top={20} width={500} height={36}
            text="Vue 列表渲染：动态增删 + 排序"
            color="#333" verticalAlign="middle"
          />

          <f-rectangle
            left={60} top={70} width={90} height={32}
            backgroundColor="#27ae60" radius={6}
            onClick={addItem}
          >
            <f-text
              width={90} height={32}
              text="+ 添加" color="#fff"
              textAlign="center" verticalAlign="middle"
            />
          </f-rectangle>

          <f-rectangle
            left={170} top={70} width={120} height={32}
            backgroundColor="#3498db" radius={6}
            onClick={() => { sortAsc.value = !sortAsc.value; }}
          >
            <f-text
              width={120} height={32}
              text={sortAsc.value ? "排序: 正序 ↑" : "排序: 倒序 ↓"}
              color="#fff" textAlign="center" verticalAlign="middle"
            />
          </f-rectangle>

          {sorted.value.map((item, index) => (
            <f-rectangle
              key={item.id}
              left={60} top={120 + index * 56}
              width={300} height={46}
              backgroundColor={item.color} radius={8}
            >
              <f-circle
                left={10} top={8} width={30} height={30}
                backgroundColor="rgba(255,255,255,0.3)"
              />
              <f-text
                left={50} top={0} width={160} height={46}
                text={item.label} color="#fff" verticalAlign="middle"
              />
              <f-rectangle
                left={230} top={8} width={60} height={30}
                backgroundColor="rgba(0,0,0,0.2)" radius={4}
              >
                <f-text
                  width={60} height={30}
                  text="删除" color="#fff"
                  onClick={() => removeItem(item.id)}
                  textAlign="center" verticalAlign="middle"
                />
              </f-rectangle>
            </f-rectangle>
          ))}
        </f-artboard>
      </f-workspace>
    );
  },
});

registerDemo("vue-list", {
  title: "Vue 列表渲染",
  group: "Vue",
  order: 5,
  setup(el, { width, height }) {
    const root = new Root(el, { width, height });
    createApp(App).mount(root);
    return () => root.unmounted();
  },
});

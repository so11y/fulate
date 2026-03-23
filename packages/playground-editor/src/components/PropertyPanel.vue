<script setup lang="ts">
import { computed } from "vue";
import { store, refreshSelection } from "../store";

const props = computed(() => store.selectedProps);
const count = computed(() => store.selectedElements.length);
const isMulti = computed(() => count.value >= 2);

function updateProp(key: string, value: any) {
  const select = store.select;
  if (!select || !select.selectEls.length) return;

  select.history.snapshot(select.selectEls);

  if (select.selectEls.length === 1) {
    select.selectEls[0].setOptions({ [key]: value });
  } else {
    select.selectEls.forEach((el) => el.setOptions({ [key]: value }));
  }

  select.select(select.selectEls);
  select.history.commit();
  setTimeout(refreshSelection, 30);
}

function onNumberInput(key: string, e: Event) {
  const input = e.target as HTMLInputElement;
  updateProp(key, Number(input.value));
}

function onTextInput(key: string, e: Event) {
  const input = e.target as HTMLInputElement;
  updateProp(key, input.value);
}

function onColorInput(key: string, e: Event) {
  const input = e.target as HTMLInputElement;
  updateProp(key, input.value);
}

function onRangeInput(key: string, e: Event) {
  const input = e.target as HTMLInputElement;
  updateProp(key, Number(input.value));
}

function align(type: string) {
  store.select?.align(type as any);
  setTimeout(refreshSelection, 50);
}
</script>

<template>
  <div class="panel">
    <template v-if="props">
      <div class="panel-header">
        <h3>属性</h3>
        <span class="type-badge">{{ props.type }}</span>
      </div>

      <!-- Position & Size -->
      <div class="section">
        <div class="section-title">位置与尺寸</div>
        <div class="prop-grid">
          <div class="prop-row">
            <label>X</label>
            <input
              type="number"
              :value="props.left"
              @change="onNumberInput('left', $event)"
            />
          </div>
          <div class="prop-row">
            <label>Y</label>
            <input
              type="number"
              :value="props.top"
              @change="onNumberInput('top', $event)"
            />
          </div>
          <template v-if="count === 1">
            <div class="prop-row">
              <label>W</label>
              <input
                type="number"
                :value="props.width"
                @change="onNumberInput('width', $event)"
                min="1"
              />
            </div>
            <div class="prop-row">
              <label>H</label>
              <input
                type="number"
                :value="props.height"
                @change="onNumberInput('height', $event)"
                min="1"
              />
            </div>
            <div class="prop-row full">
              <label>旋转</label>
              <input
                type="number"
                :value="props.angle"
                @change="onNumberInput('angle', $event)"
              />
              <span class="unit">°</span>
            </div>
          </template>
        </div>
      </div>

      <!-- Appearance (single selection) -->
      <div class="section" v-if="count === 1">
        <div class="section-title">外观</div>
        <div class="prop-grid">
          <div class="prop-row full" v-if="props.opacity !== undefined">
            <label>透明度</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              :value="props.opacity"
              @input="onRangeInput('opacity', $event)"
            />
            <span class="range-val">{{
              Number(props.opacity).toFixed(2)
            }}</span>
          </div>
          <div class="prop-row" v-if="props.backgroundColor !== undefined">
            <label>填充</label>
            <div class="color-wrap">
              <input
                type="color"
                :value="props.backgroundColor || '#ffffff'"
                @input="onColorInput('backgroundColor', $event)"
              />
              <span class="color-hex">{{ props.backgroundColor }}</span>
            </div>
          </div>
          <div class="prop-row" v-if="props.radius !== undefined">
            <label>圆角</label>
            <input
              type="number"
              :value="props.radius"
              @change="onNumberInput('radius', $event)"
              min="0"
            />
          </div>
          <div class="prop-row" v-if="props.borderWidth !== undefined">
            <label>边框</label>
            <input
              type="number"
              :value="props.borderWidth"
              @change="onNumberInput('borderWidth', $event)"
              min="0"
            />
          </div>
          <div
            class="prop-row"
            v-if="props.borderColor !== undefined && props.borderWidth > 0"
          >
            <label>边框色</label>
            <div class="color-wrap">
              <input
                type="color"
                :value="props.borderColor || '#000000'"
                @input="onColorInput('borderColor', $event)"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Text properties -->
      <div
        class="section"
        v-if="count === 1 && props.text !== undefined"
      >
        <div class="section-title">文本</div>
        <div class="prop-grid">
          <div class="prop-row full">
            <label>内容</label>
            <input
              type="text"
              :value="props.text"
              @change="onTextInput('text', $event)"
            />
          </div>
          <div class="prop-row" v-if="props.fontSize !== undefined">
            <label>字号</label>
            <input
              type="number"
              :value="props.fontSize"
              @change="onNumberInput('fontSize', $event)"
              min="8"
            />
          </div>
          <div class="prop-row" v-if="props.color !== undefined">
            <label>字色</label>
            <div class="color-wrap">
              <input
                type="color"
                :value="props.color || '#000000'"
                @input="onColorInput('color', $event)"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Multi-select alignment -->
      <div class="section" v-if="isMulti">
        <div class="section-title">对齐</div>
        <div class="align-grid">
          <button @click="align('justify-start')" title="左对齐">⫷</button>
          <button @click="align('justify-center')" title="水平居中">⫿</button>
          <button @click="align('justify-end')" title="右对齐">⫸</button>
          <button @click="align('align-start')" title="顶对齐">⊤</button>
          <button @click="align('align-center')" title="垂直居中">⊝</button>
          <button @click="align('align-end')" title="底对齐">⊥</button>
        </div>
        <div class="align-grid" style="margin-top: 4px" v-if="count >= 3">
          <button
            @click="align('justify-between')"
            title="水平均分"
            style="grid-column: span 3"
          >
            水平均分
          </button>
          <button
            @click="align('align-between')"
            title="垂直均分"
            style="grid-column: span 3"
          >
            垂直均分
          </button>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="empty-state">
        <div class="empty-icon">🖱️</div>
        <p>点击选择元素</p>
        <p>或拖拽框选多个元素</p>
        <p class="hint">右键打开菜单</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.panel {
  width: 248px;
  background: #fafafa;
  border-left: 1px solid #e0e0e0;
  overflow-y: auto;
  flex-shrink: 0;
  font-size: 13px;
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px 8px;
  border-bottom: 1px solid #eee;
}
.panel-header h3 {
  font-size: 14px;
  color: #333;
  font-weight: 600;
}
.type-badge {
  padding: 2px 8px;
  background: #e8f0fe;
  color: #1a73e8;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}
.section {
  padding: 10px 14px;
  border-bottom: 1px solid #eee;
}
.section-title {
  font-size: 10px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 8px;
  font-weight: 600;
}
.prop-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.prop-row {
  display: flex;
  align-items: center;
  gap: 6px;
  width: calc(50% - 3px);
}
.prop-row.full {
  width: 100%;
}
.prop-row label {
  font-size: 11px;
  color: #666;
  min-width: 28px;
  flex-shrink: 0;
}
.prop-row input[type="number"],
.prop-row input[type="text"] {
  flex: 1;
  padding: 4px 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  width: 0;
  background: #fff;
  outline: none;
  transition: border-color 0.15s;
}
.prop-row input:focus {
  border-color: #1a73e8;
}
.prop-row input[type="range"] {
  flex: 1;
}
.unit {
  font-size: 11px;
  color: #999;
}
.range-val {
  font-size: 11px;
  color: #666;
  min-width: 30px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.color-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
}
.color-wrap input[type="color"] {
  width: 28px;
  height: 24px;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 1px;
  cursor: pointer;
  background: #fff;
}
.color-hex {
  font-size: 11px;
  color: #888;
  font-family: monospace;
}
.align-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 4px;
}
.align-grid button {
  padding: 6px 4px;
  border: 1px solid #ddd;
  background: #fff;
  border-radius: 5px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.12s;
}
.align-grid button:hover {
  background: #e8f0fe;
  border-color: #1a73e8;
}
.empty-state {
  color: #aaa;
  text-align: center;
  padding: 60px 20px;
  line-height: 2;
}
.empty-icon {
  font-size: 32px;
  margin-bottom: 8px;
}
.empty-state p {
  font-size: 13px;
}
.empty-state .hint {
  margin-top: 16px;
  font-size: 11px;
  color: #ccc;
}
</style>

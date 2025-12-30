// import { Drag, Select } from "./extension";

import { Root } from "./lib/root";
import { Select } from "./lib/select";
import { Div } from "./lib/ui/div";

const root = new Root(document.getElementById("app")! as HTMLElement, {
  width: 500,
  height: 500,
});

const select = new Select()

const div1 = new Div({
  left: 100,
 top: 100,
  width: 50,
  height: 50,
  backgroundColor: "red"
});

const div2 = new Div({
  left: 170,
  top: 100,
  width: 50,
  height: 50,
  angle: 0,
  // originX: "left",
  // originY: "top",
  backgroundColor: "blue"
});
root.append(select, div1, div2);

root.mounted()
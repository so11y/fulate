import { Root } from "./lib/root";
import { Select } from "./lib/tools/select";
import { Rectangle } from "./lib/ui/rectangle";
import { Rule } from "./lib/tools/rule";
import { Layer } from "./lib/layer";
import { Snap } from "./lib/tools/select/snap";
import { Artboard } from "./lib/ui/artboard";
import { Workspace } from "./lib/ui/workspace";
import { Rectangle as Div, Display, FlexDirection, Justify } from "./yoga/base";

const root = new Root(document.getElementById("app")! as HTMLElement, {
  width: window.innerWidth,
  height: window.innerHeight
});

const editerLayer = new Layer({
  zIndex: 2,
  children: [
    new Rule(), new Select(), new Snap()
  ]
});

const div1 = new Rectangle({
  key: "344",
  left: 300,
  top: 100,
  width: 50,
  height: 50,
  radius: 20,
  cursor: "pointer",
  backgroundColor: "red",
  onclick: (e) => {
    console.log("div1 clicked", e);

    e.detail.target.setOptions({
      backgroundColor: "yellow"
    });
  }
});

const div2 = new Rectangle({
  left: 170,
  top: 100,
  width: 50,
  height: 50,
  angle: 0,
  // originX: "left",
  // originY: "top",
  backgroundColor: "blue"
});

const dev3 = new Rectangle({
  left: 0,
  top: 0,
  width: 30,
  height: 30,
  backgroundColor: "yellow"
});

root.append(
  // floorLayer,
  // div1,
  // div2,
  new Workspace({
    backgroundColor: "#E5E5E5",
    width: 1920,
    height: 900,
    children: [
      new Artboard({
        children: [
          div1,
          div2,
          dev3,
          new Div({
            left: 300,
            top: 170,
            width: 100,
            height: 100,
            display: Display.Flex,
            backgroundColor: "pink",
            justifyContent: Justify.SpaceAround,
            children: [
              new Div({
                width: 50,
                backgroundColor: "black",
                onclick(e) {
                  e.detail.target.setOptions({
                    width: 10
                  });
                }
              }),
              new Div({
                width: 10,
                backgroundColor: "red"
              })
            ]
          }),
          new Layer({
            zIndex: 2,
            children: [
              new Rectangle({
                left: 30,
                width: 100,
                height: 100,
                backgroundColor: "pink"
              })
            ]
          })
        ],
        onclick: (e) => {
          console.log("div1 clicked", e);
        }
      })
    ]
  }),
  editerLayer
);

// div1.addEventListener("click", (e) => {
//   e.detail.target
//     .setOptions({
//       backgroundColor: "yellow"
//     })
//     .layer.render();
// });

root.mounted();

console.log(root, "--");

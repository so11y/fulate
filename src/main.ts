import { Root } from "./lib/root";
import { Select } from "./lib/tools/select";
import { Rectangle } from "./lib/ui/rectangle";
import { Rule } from "./lib/tools/rule";
import { Layer, FullLayer } from "./lib/layer";
import { Snap } from "./lib/tools/select/snap";
import { Artboard } from "./lib/ui/artboard";
import { Rectangle as Div, Display, FlexDirection, Justify } from "./yoga/base";

const root = new Root(document.getElementById("app")! as HTMLElement, {
  width: window.innerWidth,
  height: window.innerHeight
});

const editerLayer = new FullLayer({
  zIndex: 2,
  children: [
    new Rule(),
    new Select({
      targetKey: "artboard"
    }),
    new Snap({
      targetKey: "artboard"
    })
  ]
});

const floorLayer = new FullLayer({
  children: []
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
  floorLayer,
  // div1,
  // div2,
  // new FullLayer({
  //   zIndex: 2,
  //   selectctbale: true,
  //   children: [dev3]
  // }),
  new Artboard({
    width: 1920,
    height: 900,
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
                width: "10%"
              });
            }
          }),
          new Div({
            width: 10,
            backgroundColor: "red"
          })
        ]
      })
      // new FullLayer({
      //   zIndex: 3,
      //   selectctbale: true,
      //   children: [dev3]
      // })
    ],
    onclick: (e) => {
      console.log("div1 clicked", e);
      // e.detail.target.setOptions({
      //   backgroundColor: "yellow"
      // });

      // e.detail.target.root.focusNode(e.detail.target);
    }
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

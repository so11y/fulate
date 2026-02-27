import { Root } from "./lib/root";
import { Select } from "./lib/tools/select";
import { Rectangle } from "./lib/ui/rectangle";
import { Rule } from "./lib/tools/rule";
import { Layer, FullLayer } from "./lib/layer";
import { Snap } from "./lib/tools/select/snap";
import { Artboard } from "./lib/ui/artboard";

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
      dev3
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

      e.detail.target.root.focusNode(e.detail.target);
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

// -------------------

// import { Root } from "./yoga/root";
// import { Rectangle as Div, Display, FlexDirection } from "./yoga/base";
// import { Select } from "./lib/tools/select";

// const root = new Root(document.getElementById("app")! as HTMLElement, {
//   width: 500,
//   height: 500
// });

// root
//   .append(
//     // new Select(),
//     new Div({
//       display: Display.Flex,
//       flexDirection: FlexDirection.Row,
//       backgroundColor: "yellow",
//       width: 300,
//       height: 150,
//       marginLeft: 30,
//       marginTop: 30,
//       paddingTop: 20,
//       paddingLeft: 5,
//       // onclick(e) {
//       //   console.log("---");
//       //   e.detail.target
//       //     .setOptions({
//       //       backgroundColor: "black"
//       //     })
//       //     .layer.render();
//       // },
//       children: [
//         new Div({
//           width: 100,
//           height: 100,
//           onclick(e) {
//             e.detail.target.parent
//               .setOptions({
//                 backgroundColor: "green",
//                 width: 50
//               })
//               .layer.render();
//             e.detail.target
//               .setOptions({
//                 backgroundColor: "red",
//                 width: 30
//               })
//               .layer.render();
//           }
//         }),
//         new Div({
//           width: 100,
//           height: 100,
//           backgroundColor: "blue"
//         })
//       ]
//     }),
//     new Div({
//       height: 30,
//       width: 50,
//       backgroundColor: "pink"
//     })
//   )
//   .mounted();

// import { Root } from "./lib/root";
// import { Select } from "./lib/tools/select";
// import { Rectangle } from "./lib/ui/rectangle";
// import { Rule } from "./lib/tools/rule";
// import { Layer, FullLayer } from "./lib/layer";
// import { Snap } from "./lib/tools/select/snap";

// const root = new Root(document.getElementById("app")! as HTMLElement, {
//   width: 500,
//   height: 500
// });

// const editerLayer = new FullLayer({
//   zIndex: 2,
//   children: [new Rule(), new Select(), new Snap()]
// });

// const floorLayer = new FullLayer({
//   children: []
// });

// const div1 = new Rectangle({
//   left: 300,
//   top: 100,
//   width: 50,
//   height: 50,
//   radius: 20,
//   cursor: "pointer",
//   backgroundColor: "red",
//   onclick: (e) => {
//     console.log("div1 clicked", e);
//   }
// });

// const div2 = new Rectangle({
//   left: 170,
//   top: 100,
//   width: 50,
//   height: 50,
//   angle: 0,
//   // originX: "left",
//   // originY: "top",
//   backgroundColor: "blue"
// });

// root.append(
//   floorLayer,
//   div1,
//   div2,
//   new Rectangle({
//     left: 0,
//     top:0,
//     width: 30,
//     height: 30,
//     backgroundColor: "yellow"
//   }),
//   editerLayer
// );

// // div1.addEventListener("click", (e) => {
// //   e.detail.target
// //     .setOptions({
// //       backgroundColor: "yellow"
// //     })
// //     .layer.render();
// // });

// root.mounted();

// -------------------

import { Root } from "./yoga/root";
import { Rectangle as Div, Display, FlexDirection } from "./yoga/base";
import { Select } from "./lib/tools/select";

const root = new Root(document.getElementById("app")! as HTMLElement, {
  width: 500,
  height: 500
});

root
  .append(
    new Select(),
    new Div({
      display: Display.Flex,
      flexDirection: FlexDirection.Row,
      backgroundColor: "yellow",
      width: 300,
      height: 150,
      marginLeft: 30,
      marginTop: 30,
      paddingTop: 20,
      paddingLeft: 5,
      children: [
        new Div({
          width: 100,
          height: 100
        }),
        new Div({
          width: 100,
          height: 100,
          backgroundColor: "blue"
        })
      ]
    }),
    new Div({
      height: 30,
      width: 50,
      backgroundColor: "pink"
    })
  )
  .mounted();

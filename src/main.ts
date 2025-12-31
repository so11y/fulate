// import { Root } from "./lib/root";
// import { Select } from "./lib/select";
// import { Rectangle } from "./lib/ui/rectangle";

// const root = new Root(document.getElementById("app")! as HTMLElement, {
//   width: 500,
//   height: 500
// });

// const select = new Select();

// const div1 = new Rectangle({
//   left: 100,
//   top: 100,
//   width: 50,
//   height: 50,
//   backgroundColor: "red"
// });

// div1.append(
//   new Rectangle({
//     left: 170,
//     top: 100,
//     width: 50,
//     height: 50,
//     angle: 0,
//     // originX: "left",
//     // originY: "top",
//     backgroundColor: "blue"
//   })
// );

// root.append(select, div1);

// root.mounted();

// -------------------

import { Root } from "./yoga/root";
import { Select } from "./yoga/select";
import { Element as Div, Display, FlexDirection } from "./yoga/base";

const root = new Root(document.getElementById("app")! as HTMLElement, {
  width: 500,
  height: 500
  // backgroundColor: "red"
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
          padding: 10,
          width: 100,
          height: 100,
          backgroundColor: "red",
          children: [
            new Div({
              width: "50%",
              height: "50%",
              backgroundColor: "black"
            })
          ]
        }),
        new Div({
          width: 100,
          height: 100,
          backgroundColor: "blue"
        })
      ]
    })
  )
  .mounted();

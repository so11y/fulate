import { Root } from "./lib/root";
import { Select } from "./lib/select";
import { Rectangle } from "./lib/ui/rectangle";

const root = new Root(document.getElementById("app")! as HTMLElement, {
  width: 500,
  height: 500
});

const select = new Select();

const div1 = new Rectangle({
  left: 100,
  top: 100,
  width: 50,
  height: 50,
  radius: 20,
  cursor: "pointer",
  backgroundColor: "red"
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

root.append(div1, div2, select);

div1.addEventListener("click", () => {
  console.log("??");
});

root.mounted();

// -------------------

// import { Root } from "./yoga/root";
// import { Select } from "./yoga/select";
// import { Element as Div, Display, FlexDirection } from "./yoga/base";

// const root = new Root(document.getElementById("app")! as HTMLElement, {
//   width: 500,
//   height: 500
//   // backgroundColor: "red"
// });

// root
//   .append(
//     new Select(),
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
//       children: [
//         new Div({
//           padding: 10,
//           width: 100,
//           height: 100,
//           backgroundColor: "red",
//           children: [
//             new Div({
//               width: "50%",
//               height: "50%",
//               backgroundColor: "black"
//             })
//           ]
//         }),
//         new Div({
//           marginTop: 6,
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

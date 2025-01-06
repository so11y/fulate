import { Root } from "./lib/root";
import { Element } from "./lib/base";
import { Group } from "./lib/group";
import { Padding } from "./lib/padding";
//还需要改造一下Expanded
import { Expanded } from "./lib/expanded"
import { Size } from "./lib/size";

const div = new Element({
  width: 50,
  backgroundColor: "red",
})

const div2 = new Element({
  width: 50,
  backgroundColor: "blue",
})

// const div3 = new Expanded(
//   {
//     child: new Element({
//       backgroundColor: "yellow",
//     })
//   }
// )
//因为下面设置了padding
//所以要把宽度放到外面去
const group = new Group({
  display: "flex",
  flexDirection: "row",
  flexWrap: "wrap",
  children: [
    div,
    div2,
    // div3
  ],
})


const root = new Root({
  el: document.getElementById("canvas") as HTMLCanvasElement,
  width: 500,
  height: 500,
  children: [
    new Size({
      width: 100,
      height: 100,
      child: new Padding({
        padding: [0, 0, 0, 0],
        child: group
      })
    }),
  ],
})


setTimeout(() => {
  // group.appendChild(
  //   new Element({
  //     width: 50,
  //     backgroundColor: "black",
  //   })
  // )
}, 1000)


root.render()

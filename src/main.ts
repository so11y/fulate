import { Root } from "./lib/root";
import { Element } from "./lib/base";
import { Group } from "./lib/group";
import { Padding } from "./lib/padding";
import { Expanded } from "./lib/expanded";
import { Size } from "./lib/size";

const div = new Element({
  width: 50,
  backgroundColor: "pink",
  children: [
    new Element({
      width: 20,
      height: 30,
      backgroundColor: "red"
    })
  ]
});

const div2 = new Element({
  width: 20,
  height: 30,
  backgroundColor: "blue"
});

const div3 = new Element({
  width: 50,
  height: 30,
  backgroundColor: "black"
});

const div4 = new Expanded({
  child: new Element({
    // height: 10,
    backgroundColor: "yellow"
  })
});
const div5 = new Expanded({
  child: new Element({
    // height: 10,
    backgroundColor: "purple"
  })
});

const group = new Group({
  flexDirection: "row",
  flexWrap: "wrap",
  children: [div, div2, div3, div4, div5]
});

const root = new Root({
  el: document.getElementById("canvas") as HTMLCanvasElement,
  width: 500,
  height: 500,
  children: [
    new Group({
      flexDirection: "column",
      children: [
        new Size({
          width: 100,
          height: 100,
          backgroundColor: "green",
          child: new Padding({
            padding: [0, 0, 0, 40],
            child: group
          })
        }),
        new Size({
          width: 100,
          height: 100,
          backgroundColor: "red"
        })
      ]
    })

    // new Size({
    //   width: 100,
    //   height: 100,
    //   backgroundColor: "blue"
    // })
  ]
});

setTimeout(() => {
  // group.appendChild(
  //   new Element({
  //     width: 50,
  //     backgroundColor: "black",
  //   })
  // )
}, 1000);

root.render();

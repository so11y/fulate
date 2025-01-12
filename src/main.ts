import { Root } from "./lib/root";
import { Element } from "./lib/base";
import { Group } from "./lib/group";
import { Padding } from "./lib/padding";
import { Expanded } from "./lib/expanded";
import { Size } from "./lib/size";

const dev0 = new Element({
  width: 10,
  height: 10,
  backgroundColor: "black"
});
const div = new Element({
  width: 50,
  backgroundColor: "pink"
  // children: [dev0]
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
  // flexDirection: "column",
  backgroundColor: "blue",
  children: [
    div,
    // div2,
    // div3,
    div4
    // div5
  ]
});

const root = new Root({
  el: document.getElementById("canvas") as HTMLCanvasElement,
  width: 500,
  height: 500,
  animationSwitch: true,
  children: [
    new Size({
      width: 100,
      maxHeight: 100,
      backgroundColor: "green",
      child: new Size({
        minWidth: 50,
        height: 110,
        backgroundColor: "red",
      })
    })
    // new Group({
    //   flexDirection: "column",
    //   children: [
    //     // new Size({
    //     //   width: 20,
    //     //   height: 20,
    //     //   backgroundColor: "red"
    //     // }),
    //     new Size({
    //       width: 100,
    //       height: 100,
    //       backgroundColor: "green",
    //       child: new Padding({
    //         padding: [0, 0, 20, 40],
    //         child: group
    //       })
    //     })
    //   ]
    // })
  ]
});

setTimeout(() => {
  // dev0.setAttributes({
  //   width: 40,
  //   height: 40
  // });
  // group.appendChild(div5);
}, 1000);

root.render();

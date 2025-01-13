import { Root } from "./lib/root";
import { Element } from "./lib/base";
import { Group } from "./lib/group";
import { Padding } from "./lib/padding";
import { Expanded } from "./lib/expanded";
import { Div } from "./lib/div";

const dev0 = new Div({
  width: 10,
  backgroundColor: "black"
});

const div = new Div({
  width: 20,
  height: 20,
  backgroundColor: "pink",
  children: [dev0]
});

const div2 = new Div({
  width: 20,
  height: 30,
  backgroundColor: "blue"
});

const div3 = new Div({
  width: 50,
  height: 30,
  backgroundColor: "black"
});

const div4 = new Expanded({
  child: new Div({
    backgroundColor: "yellow"
  })
});
const div5 = new Div({
  children: [
    new Div({
      height: 10,
      backgroundColor: "purple"
    })
  ]
});

const group = new Group({
  // flexDirection: "column",
  backgroundColor: "blue",
  children: [
    div,
    // div2,
    // div3,
    div4,
    new Expanded({
      child: new Div({
        backgroundColor: "red"
      })
    })
    // new Expanded({
    //   child: new Padding({
    //     padding: [0, 0, 0, 40],
    //     child: new Element({
    //       width: Number.MAX_VALUE,
    //       height: Number.MAX_VALUE,
    //       backgroundColor: "red"
    //     })
    //   })
    // }),
    // new Expanded({
    //   child: new Padding({
    //     padding: [0, 40, 0,0],
    //     child: new Element({
    //       width: Number.MAX_VALUE,
    //       height: Number.MAX_VALUE,
    //       backgroundColor: "yellow"
    //     })
    //   })
    // })

    // new Expanded({
    //   child: new Element({
    //     backgroundColor: "purple"
    //   })
    // })
    // div5
  ]
});

const root = new Root({
  el: document.getElementById("canvas") as HTMLCanvasElement,
  width: 500,
  height: 500,
  animationSwitch: true,
  children: [
    new Div({
      width: 100,
      height: 100,
      backgroundColor: "green",
      child: new Padding({
        padding: [0, 0, 0, 0],
        child: group
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
  console.log(2222);
  // div.setAttributes({
  //   width: 40,
  //   height: 40
  // });
  // group.appendChild(div5);
}, 1000);

root.render();

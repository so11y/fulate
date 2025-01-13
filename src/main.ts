import { Root } from "./lib/root";
import { Element } from "./lib/base";
import { Group } from "./lib/group";
import { Padding } from "./lib/padding";
import { Expanded } from "./lib/expanded";
import { Div } from "./lib/div";
import { Margin } from "./lib/margin";
import { Row } from "./lib/row";

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
  flexBasis: 50,
  flex: 0,
  child: new Div({
    height: 50,
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
  flexWrap: "wrap",
  height: 100,
  backgroundColor: "blue",
  flexDirection: "row",
  // justifyContent: "space-between",
  // alignItems: "center",
  children: [
    new Div({
      width: 20,
      height: 30,
      backgroundColor: "red"
    }),
    new Div({
      width: 30,
      height: 20,
      backgroundColor: "yellow"
    }),
    new Div({
      width: 20,
      height: 20,
      backgroundColor: "yellow"
    }),
    new Div({
      width: 40,
      height: 20,
      backgroundColor: "black"
    })
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

root.render();

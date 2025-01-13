import { Root } from "./lib/root";
import { Group } from "./lib/group";
import { Padding } from "./lib/padding";
import { Expanded } from "./lib/expanded";
import { Div } from "./lib/div";
import { Margin } from "./lib/margin";
import { Row } from "./lib/row";
import { CircleImg, Img } from "./lib/img";


const root = new Root({
  el: document.getElementById("canvas") as HTMLCanvasElement,
  width: 500,
  height: 500,
  animationSwitch: true,
  children: [
    new Div({
      height: 80,
      child: new Group({
        children: [
          new Div({
            width: 60,
            backgroundColor: "#d0cae3",
            child: new Group({
              justifyContent: "center",
              alignItems: "center",
              children: [
                new CircleImg({
                  src: "https://lf9-dp-fe-cms-tos.byteorg.com/obj/bit-cloud/VTable/custom-render/flower.jpg",
                  width: 50,
                  height: 50
                }),
              ]
            })
          }),
          new Expanded({
            child: new Group({
              flexDirection: "column",
              children: [
                new Expanded({
                  child: new Div({
                    height: Number.MAX_VALUE,
                    backgroundColor: "red"
                  })
                }),
                new Expanded({
                  child: new Div({
                    backgroundColor: "#c2d8cf",
                    child: new Padding({
                      padding: [0, 10, 0, 10],
                      child: new Group({
                        alignItems: "center",
                        children: [
                          new Margin({
                            margin: [0, 10, 0, 0],
                            child: new Div({
                              width: 40,
                              height: 20,
                              radius: 4,
                              backgroundColor: "red"
                            })
                          }),
                          new Margin({
                            margin: [0, 10, 0, 0],
                            child: new Div({
                              width: 40,
                              height: 20,
                              radius: 4,
                              backgroundColor: "blue"
                            })
                          }),
                          new Margin({
                            margin: [0, 10, 0, 0],
                            child: new Div({
                              width: 40,
                              height: 20,
                              radius: 4,
                              backgroundColor: "yellow"
                            })
                          }),
                        ]
                      })
                    })
                  })
                })
              ]
            })
          })
        ]
      })
    })
  ]
});

root.render();

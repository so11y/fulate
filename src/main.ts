import { Root } from "./lib/root";
import { Group } from "./lib/group";
import { Padding } from "./lib/padding";
import { Expanded } from "./lib/expanded";
import { Div } from "./lib/div";
import { Margin } from "./lib/margin";
import { Row } from "./lib/row";
import { CircleImg, Img } from "./lib/img";
import { Container } from "./lib/container";

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
          new Group({
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#d0cae3",
            width: 60,
            children: [
              new CircleImg({
                src: "https://lf9-dp-fe-cms-tos.byteorg.com/obj/bit-cloud/VTable/custom-render/flower.jpg",
                width: 50,
                height: 50
              })
            ]
          }),
          //其他元素都是已知宽或高
          //那么最后可以不用Expanded,会把剩余Group宽度高度拉满,Container会把宽度拉满
          new Group({
            flexDirection: "column",
            children: [
              new Expanded({
                child: new Div({
                  height: Number.MAX_VALUE,
                  backgroundColor: "red"
                })
              }),
              new Expanded({
                child: new Container({
                  backgroundColor: "#c2d8cf",
                  padding: [0, 10, 0, 10],
                  child: new Group({
                    alignItems: "center",
                    children: [
                      new Container({
                        margin: [0, 10, 0, 0],
                        width: 40,
                        height: 20,
                        radius: 4,
                        backgroundColor: "red"
                      }),
                      new Container({
                        margin: [0, 10, 0, 0],
                        width: 40,
                        height: 20,
                        radius: 4,
                        backgroundColor: "blue"
                      }),
                      new Container({
                        margin: [0, 10, 0, 0],
                        width: 40,
                        height: 20,
                        radius: 4,
                        backgroundColor: "yellow"
                      })
                    ]
                  })
                })
              })
            ]
          })
        ]
      })
    })
  ]
});

root.render();

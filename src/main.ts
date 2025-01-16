import { Root } from "./lib/root";
import { Group } from "./lib/group";
import { Padding } from "./lib/padding";
import { Expanded } from "./lib/expanded";
import { Row } from "./lib/row";
import { CircleImg, Img } from "./lib/img";
import { Container } from "./lib/container";
import { Text } from "./lib/text";
import { AnimationType, ColorTween, Keyframe, Keyframes, Tween } from "ac";
import { Element } from "./lib/base";

const root = new Root({
  el: document.getElementById("canvas") as HTMLCanvasElement,
  width: 500,
  height: 500,
  animationSwitch: true,
  children: [
    new Group({
      height: 80,
      children: [
        new Group({
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#d0cae3",
          width: 60,
          children: [
            new CircleImg({
              backgroundColor: "blue",
              src: "https://lf9-dp-fe-cms-tos.byteorg.com/obj/bit-cloud/VTable/custom-render/flower.jpg",
              width: 50,
              height: 50
            })
          ]
        }),
        // 其他元素都是已知宽或高
        // // 那么最后可以不用Expanded,会把剩余Group宽度高度拉满,Container会把宽度拉满
        new Group({
          flexDirection: "column",
          children: [
            new Expanded({
              child: new Container({
                padding: [0, 10, 0, 10],
                backgroundColor: "red",
                child: new Group({
                  alignItems: "center",
                  children: [
                    new Text({
                      font: {
                        weight: "bold"
                      },
                      text: "hook哥还是牛的"
                    })
                  ]
                })
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
                      padding: [0, 4, 0, 4],
                      radius: 4,
                      width: "auto",
                      rotate: 90,
                      backgroundColor: "red",
                      key: "俊飞盒子",
                      child: new Text({
                        color: "#fff",
                        text: "hello",
                        key: "俊飞"
                      })
                    }),
                    new Container({
                      margin: [0, 10, 0, 0],
                      padding: [0, 4, 0, 4],
                      radius: 4,
                      width: "auto",
                      backgroundColor: "red",
                      child: new Text({
                        color: "#fff",
                        text: "俊飞"
                      })
                    }),
                    new Container({
                      margin: [0, 10, 0, 0],
                      padding: [0, 4, 0, 4],
                      radius: 4,
                      width: "auto",
                      backgroundColor: "red",
                      child: new Text({
                        color: "#fff",
                        text: "hook"
                      })
                    })
                  ]
                })
              })
            })
          ]
        })
      ]
    })
  ]
});

root.mounted();

const junFeiBox = root.getElementByKey("俊飞盒子")!;
// const junFei = root.getElementByKey("俊飞")!;
junFeiBox.addEventListener("click", (e) => {
  console.log(e.detail, 2);
});
junFeiBox.addEventListener("pointermove", (e) => {
  console.log(e.detail, 2);
});

setTimeout(() => {
  console.log(2);
  junFeiBox.setAttributes({
    rotate: 34
  });
}, 1000)


// junFei.click()

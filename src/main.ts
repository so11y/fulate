import { Element, CircleImg, Container, Expanded, Group, Root, Text } from "./lib";

const root = Root({
  el: document.getElementById("canvas") as HTMLCanvasElement,
  width: 500,
  height: 500,
  animationSwitch: true,
  children: [
    Group({
      height: 80,
      backgroundColor: "black",
      children: [
        Group.hFull({
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#d0cae3",
          width: 60,
          children: [
            CircleImg({
              backgroundColor: "blue",
              src: "https://lf9-dp-fe-cms-tos.byteorg.com/obj/bit-cloud/VTable/custom-render/flower.jpg",
              width: 50,
              height: 50
            })
          ]
        }),
        Group({
          flexDirection: "column",
          backgroundColor: "blue",
          children: [
            Expanded({
              child: Container({
                padding: [0, 10, 0, 10],
                backgroundColor: "red",
                child: Group.hFull({
                  alignItems: "center",
                  children: [
                    Text({
                      font: {
                        weight: "bold"
                      },
                      text: "hook哥还是牛的"
                    })
                  ]
                })
              })
            }),
            Expanded({
              child: Container({
                backgroundColor: "#c2d8cf",
                padding: [0, 10, 0, 10],
                child: Group.hFull({
                  alignItems: "center",
                  children: [
                    Container({
                      margin: [0, 10, 0, 0],
                      padding: [0, 4, 0, 4],
                      radius: 4,
                      width: "auto",
                      rotate: 90,
                      backgroundColor: "red",
                      key: "俊飞盒子",
                      child: Text({
                        color: "#fff",
                        text: "hello",
                        key: "俊飞"
                      })
                    }),
                    Container({
                      margin: [0, 10, 0, 0],
                      padding: [0, 4, 0, 4],
                      radius: 4,
                      width: "auto",
                      backgroundColor: "red",
                      child: Text({
                        color: "#fff",
                        text: "俊飞"
                      })
                    }),
                    Container({
                      margin: [0, 10, 0, 0],
                      padding: [0, 4, 0, 4],
                      radius: 4,
                      width: "auto",
                      backgroundColor: "red",
                      child: Text({
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

junFeiBox.setAttributes({
  rotate: 34
});


// junFei.click()

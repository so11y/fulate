import { Element, CircleImg, Container, Expanded, Group, Root, Text, Row } from "./lib";
import { TextOptions } from "./lib/text";

// const root = Root({
//   el: document.getElementById("canvas") as HTMLCanvasElement,
//   width: 500,
//   height: 500,
//   animationSwitch: true,
//   children: [

//   ]
// });

// root.mounted();


// const k1 = root.getElementByKey("k1")!
// k1.addEventListener("mouseenter", (e) => {
//   console.log("mouseenter");
// })

// k1.addEventListener("mouseleave", (e) => {
//   console.log("mouseleave");
// })

// k1.addEventListener("click", (e) => {
//   console.log(e, e.detail, "click");
// })

const root = Root({
  el: document.getElementById("canvas") as HTMLCanvasElement,
  width: 500,
  height: 500,
  animationSwitch: true,
  children: [
    Element({
      width: 100,
      height: 100,
      backgroundColor: "red",
      children:[
        Element.hFull({
          backgroundColor:"blue"
        })
      ]
    })
    // Group({
    //   height: 80,
    //   children: [
    //     Group.hFull({
    //       justifyContent: "center",
    //       alignItems: "center",
    //       backgroundColor: "#d0cae3",
    //       width: 60,
    //       children: [
    //         CircleImg({
    //           backgroundColor: "blue",
    //           src: "https://lf9-dp-fe-cms-tos.byteorg.com/obj/bit-cloud/VTable/custom-render/flower.jpg",
    //           width: 50,
    //           height: 50
    //         })
    //       ]
    //     }),
    //     Group({
    //       flexDirection: "column",
    //       backgroundColor: "blue",
    //       children: [
    //         Expanded({
    //           child: Container({
    //             padding: [0, 10, 0, 10],
    //             backgroundColor: "red",
    //             child: Group.hFull({
    //               alignItems: "center",
    //               children: [
    //                 Text({
    //                   font: {
    //                     weight: "bold"
    //                   },
    //                   text: "hook哥还是牛的"
    //                 })
    //               ]
    //             })
    //           })
    //         }),
    //         Expanded({
    //           child: Container({
    //             backgroundColor: "#c2d8cf",
    //             padding: [0, 10, 0, 10],
    //             child: Group.hFull({
    //               alignItems: "center",
    //               children: [
    //                 Container({
    //                   margin: [0, 10, 0, 0],
    //                   padding: [0, 4, 0, 4],
    //                   radius: 4,
    //                   width: "auto",
    //                   rotate: 90,
    //                   backgroundColor: "red",
    //                   key: "俊飞盒子",
    //                   child: Text({
    //                     color: "#fff",
    //                     text: "可以点我的",
    //                     key: "俊飞"
    //                   })
    //                 }),
    //                 Container({
    //                   margin: [0, 10, 0, 0],
    //                   padding: [0, 4, 0, 4],
    //                   radius: 4,
    //                   width: "auto",
    //                   backgroundColor: "red",
    //                   child: Text({
    //                     color: "#fff",
    //                     text: "俊飞"
    //                   })
    //                 }),
    //                 Container({
    //                   margin: [0, 10, 0, 0],
    //                   padding: [0, 4, 0, 4],
    //                   radius: 4,
    //                   width: "auto",
    //                   backgroundColor: "red",
    //                   child: Text({
    //                     color: "#fff",
    //                     text: "hook"
    //                   })
    //                 })
    //               ]
    //             })
    //           })
    //         })
    //       ]
    //     })
    //   ]
    // })
  ]
});

root.mounted();

const junFeiBox = root.getElementByKey("俊飞盒子")!;
const junFei = root.getElementByKey("俊飞")!;


junFeiBox.addEventListener("click", (e) => {
  junFei.setAttributes<TextOptions>({
    text: "叫你点就点？"
  });
});

junFeiBox.addEventListener("pointermove", (e) => {
  console.log(e.detail);
});

junFeiBox.setAttributes({
  rotate: 0,
});


junFei.click()

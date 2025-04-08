import {
  Element,
  CircleImg,
  Expanded,
  Group,
  Root,
  Text,
  Row,
  Scroll
} from "./lib";
import { Drag, Select } from "./extension";
import { TextOptions } from "./lib/text";

const root = Root({
  el: document.getElementById("canvas") as HTMLCanvasElement,
  width: 500,
  height: 500,
  animationSwitch: true,
  useDirtyRect: true,
  dirtyDebug: true,
  children: [
    // Element({
    //   width: 30,
    //   height: 30,
    //   backgroundColor: "red"
    // }),
    // Element({
    //   x: 30,
    //   width: 100,
    //   height: 30,
    //   backgroundColor: "blue"
    // }),
    Group({
      width: 100,
      children: [
        Element({
          width: 30,
          height: 40,
          backgroundColor: "red"
        }),
        Element({
          x: 30,
          width: 30,
          height: 40,
          backgroundColor: "red"
        })
      ]
    }),

    Group({
      y: 40,
      justifyContent: "space-between",
      alignItems: "center",
      padding: [0, 5, 0, 5],
      width: 130,
      height: 80,
      backgroundColor: "yellow",
      key: "333d",
      // cursor: "move",
      children: [
        Element({
          width: 30,
          height: 30,
          cursor: "pointer",
          backgroundColor: "blue"
        }),
        Element({
          width: 10,
          height: 30,
          backgroundColor: "black"
        })
      ]
    }),
    Select()
  ]
});

// const root = Root({
//   el: document.getElementById("canvas") as HTMLCanvasElement,
//   width: 500,
//   height: 500,
//   // animationSwitch: true,
//   // useDirtyRect: true,
//   // dirtyDebug: true,
//   children: [
//     Group({
//       flexDirection: "column",
//       children: [
//         Row({
//           margin: [0, 0, 10, 0],
//           children: [
//             Element({
//               key: "1",
//               width: 50,
//               height: 50,
//               backgroundColor: "red"
//             }),
//             Element({
//               width: 50,
//               height: 50,
//               backgroundColor: "blue"
//             }),
//             Element({
//               width: 50,
//               height: 50,
//               backgroundColor: "black"
//             })
//           ]
//         }),
//         Scroll({
//           height: 200,
//           // backgroundColor: "yellow",
//           padding: [0, 0, 0, 0],
//           children: [
//             Element({
//               width: 50,
//               height: 100,
//               backgroundColor: "red"
//             }),
//             Element({
//               width: 50,
//               height: 100,
//               backgroundColor: "blue"
//             }),
//             Group({
//               flexDirection: "column",
//               children: [
//                 Group({
//                   margin: [10, 0, 10, 0],
//                   height: 80,
//                   children: [
//                     Group.hFull({
//                       justifyContent: "center",
//                       alignItems: "center",
//                       backgroundColor: "#d0cae3",
//                       width: 60,
//                       children: [
//                         CircleImg({
//                           backgroundColor: "blue",
//                           src: "https://lf9-dp-fe-cms-tos.byteorg.com/obj/bit-cloud/VTable/custom-render/flower.jpg",
//                           width: 50,
//                           height: 50
//                         })
//                       ]
//                     }),
//                     Group({
//                       flexDirection: "column",
//                       children: [
//                         Expanded({
//                           child: Element({
//                             padding: [0, 10, 0, 10],
//                             backgroundColor: "red",
//                             child: Group.hFull({
//                               alignItems: "center",
//                               children: [
//                                 Text({
//                                   font: {
//                                     weight: "bold"
//                                   },
//                                   text: "hook哥还是牛的"
//                                 })
//                               ]
//                             })
//                           })
//                         }),
//                         Expanded({
//                           child: Element({
//                             backgroundColor: "#c2d8cf",
//                             padding: [0, 10, 0, 10],
//                             child: Group.hFull({
//                               alignItems: "center",
//                               children: [
//                                 Element({
//                                   margin: [0, 10, 0, 0],
//                                   padding: [0, 4, 0, 4],
//                                   radius: 4,
//                                   backgroundColor: "red",
//                                   key: "俊飞盒子",
//                                   child: Text({
//                                     color: "#fff",
//                                     text: "可以点我的",
//                                     key: "俊飞"
//                                   })
//                                 }),
//                                 Element({
//                                   child: Element({
//                                     margin: [0, 10, 0, 0],
//                                     padding: [0, 4, 0, 4],
//                                     radius: 4,
//                                     backgroundColor: "red",
//                                     child: Text({
//                                       color: "#fff",
//                                       text: "俊飞"
//                                     })
//                                   })
//                                 }),
//                                 Element({
//                                   margin: [0, 10, 0, 0],
//                                   padding: [0, 4, 0, 4],
//                                   radius: 4,
//                                   backgroundColor: "red",
//                                   child: Text({
//                                     color: "#fff",
//                                     text: "hook"
//                                   })
//                                 })
//                               ]
//                             })
//                           })
//                         })
//                       ]
//                     })
//                   ]
//                 }),
//                 Row({
//                   margin: [10, 0, 10, 0],
//                   children: [
//                     Element({
//                       key: "2",
//                       width: 50,
//                       height: 50,
//                       backgroundColor: "red"
//                     }),
//                     Element({
//                       width: 50,
//                       height: 50,
//                       backgroundColor: "blue"
//                     }),
//                     Element({
//                       width: 50,
//                       height: 50,
//                       backgroundColor: "black"
//                     })
//                   ]
//                 })
//               ]
//             })
//           ]
//         })
//       ]
//     })
//   ]
// });

root.mounted();
const junFei = root.getElementByKey("333d")!;
junFei.addEventListener("pointermove", (e) => {
  // e.stopPropagation();
  console.log(e.detail.target);
  // console.log(junFei, "点击了俊飞");
  // junFei.setAttributes<TextOptions>({
  //   text: "叫你点就点？"
  // });
});

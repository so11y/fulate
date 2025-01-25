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
    Group({
      children: [
        Drag({
          child: Element({
            width: 30,
            height: 30,
            backgroundColor: "red"
          })
        }),
        Drag({
          child: Element({
            width: 150,
            height: 30,
            backgroundColor: "blue"
          })
        }),
        Drag({
          child: Group({
            margin: [10, 0, 10, 10],
            height: 80,
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
                children: [
                  Expanded({
                    child: Element({
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
                    child: Element({
                      backgroundColor: "#c2d8cf",
                      padding: [0, 10, 0, 10],
                      child: Group.hFull({
                        alignItems: "center",
                        children: [
                          Element({
                            margin: [0, 10, 0, 0],
                            padding: [0, 4, 0, 4],
                            radius: 4,
                            backgroundColor: "red",
                            key: "俊飞盒子",
                            child: Text({
                              color: "#fff",
                              text: "可以点我的",
                              key: "俊飞"
                            })
                          }),
                          Element({
                            child: Element({
                              margin: [0, 10, 0, 0],
                              padding: [0, 4, 0, 4],
                              radius: 4,
                              backgroundColor: "red",
                              child: Text({
                                color: "#fff",
                                text: "俊飞"
                              })
                            })
                          }),
                          Element({
                            margin: [0, 10, 0, 0],
                            padding: [0, 4, 0, 4],
                            radius: 4,
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
const junFei = root.getElementByKey("俊飞")!;
junFei.addEventListener("click", (e) => {
  e.stopPropagation();
  junFei.setAttributes<TextOptions>({
    text: "叫你点就点？"
  });
});

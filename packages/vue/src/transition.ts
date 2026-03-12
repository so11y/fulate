import {
  defineComponent,
  h,
  BaseTransition,
  type BaseTransitionProps,
} from "@vue/runtime-core";

export const FTransition = defineComponent({
  name: "FTransition",
  props: {
    enterFrom: { type: Object, default: undefined },
    enterTo: { type: Object, default: undefined },
    leaveTo: { type: Object, default: undefined },
    duration: { type: Number, default: 300 },
  },
  setup(props, { slots }) {
    return () => {
      const baseProps: BaseTransitionProps = {
        onBeforeEnter(el: any) {
          if (props.enterFrom) {
            Object.assign(el, props.enterFrom);
            el.markDirty?.();
          }
        },
        onEnter(el: any, done: () => void) {
          if (!props.enterTo || !el.animate) {
            done();
            return;
          }

          const runAnimation = () => {
            el.animate(props.enterTo, {
              duration: props.duration,
              onComplete: done,
            });
          };

          if (el.isActiveed) {
            runAnimation();
          } else {
            el.addEventListener("activated", runAnimation, { once: true });
          }
        },
        onLeave(el: any, done: () => void) {
          if (props.leaveTo && el.animate) {
            el.animate(props.leaveTo, {
              duration: props.duration,
              onComplete: () => done(),
            });
          } else {
            done();
          }
        },
      };

      return h(BaseTransition, baseProps, slots.default);
    };
  },
});

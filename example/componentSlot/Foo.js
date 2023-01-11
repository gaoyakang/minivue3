import { h, renderSlots } from "../../lib/guide-mini-vue.esm.js";

export const Foo = {
  setup() {
    return {};
  },
  render() {
    const foo = h("p", {}, "foo");
    // 本质上是将该p虚拟节点放入到foo虚拟节点的children里
    console.log(this.$slots);
    // return h("div", {}, [foo, renderSlots(this.$slots)]);

    const age = 10;
    return h("div", {}, [
      renderSlots(this.$slots, "header", { age }),
      foo,
      renderSlots(this.$slots, "footer"),
    ]);
  },
};

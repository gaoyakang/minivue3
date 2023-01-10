import { h } from "../../lib/guide-mini-vue.esm.js";

export const Foo = {
  setup(props) {
    // 1.props是从外面传入的
    console.log(props);

    // 3.props不可被更改
    props++;
  },
  render() {
    // 2.props可以通过this访问
    return h("div", {}, "foo:" + this.count);
  },
};

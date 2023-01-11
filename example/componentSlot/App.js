import { h } from "../../lib/guide-mini-vue.esm.js";
import { Foo } from "./Foo.js";

export const App = {
  name: "App",
  render() {
    const app = h("div", {}, "App");
    // slot功能：foo中p标签要渲染在Foo组件内
    // 本质上是将该p虚拟节点放入到foo虚拟节点的children里
    // 1.渲染数组类型
    // const foo = h(Foo, {}, [h("p", {}, "123"), h("p", {}, "456")]);

    // 2.渲染单个vnode
    // const foo = h(Foo, {}, h("p", {}, "123"));

    // 3.指定渲染位置:具名插槽
    // 3.1获取指定渲染的元素，通过添加具体的名字
    // 3.2获取渲染位置
    // const foo = h(
    //   Foo,
    //   {},
    //   {
    //     header: h("p", {}, "header"),
    //     footer: h("p", {}, "footer"),
    //   }
    // );

    // 4.app中获取foo内部值:作用域插槽
    const foo = h(
      Foo,
      {},
      {
        header: ({ age }) => h("p", {}, "header" + age),
        footer: () => h("p", {}, "footer"),
      }
    );

    return h("div", {}, [app, foo]);
  },
  setup() {
    return {};
  },
};

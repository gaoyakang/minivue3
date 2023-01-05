import { render } from "./render";
import { createVNode } from "./vnode";

// rootComponent可能式传入的App组件
export function createApp(rootComponent) {
  return {
    // 1.component转化vnode
    mount(rootContainer) {
      // 创建虚拟节点
      const vnode = createVNode(rootComponent);
      // 渲染vnode
      render(vnode, rootContainer);
    },
  };
}

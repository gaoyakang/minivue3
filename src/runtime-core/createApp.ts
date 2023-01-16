import { createVNode } from "./vnode";

export function createAppAPI(render) {
  // rootComponent是传入的App根组件
  return function createApp(rootComponent) {
    return {
      // 1.component转化vnode
      mount(rootContainer) {
        // 创建虚拟根节点(包含type,props,children...属性的对象)
        const vnode = createVNode(rootComponent);
        // 渲染vnode，根据vnode的不同类型将vnode渲染成真实浏览器元素
        render(vnode, rootContainer);
      },
    };
  };
}

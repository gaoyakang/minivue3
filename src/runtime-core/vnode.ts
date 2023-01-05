// 创建虚拟节点
// type：需要处理的是什么类型component还是element
export function createVNode(type, props?, children?) {
  const vnode = {
    type,
    props,
    children,
  };
  return vnode;
}

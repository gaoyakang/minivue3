// 创建虚拟节点

import { ShapeFlags } from "../shared/ShapeFlags";

export const Fragment = Symbol("Fragment");
export const Text = Symbol("Text");

// type：需要处理的是什么类型component还是element
export function createVNode(type, props?: any, children?: string | Array<any>) {
  const vnode = {
    el: null,
    component: null, // 获取effect返回的runner
    type,
    props: props || {},
    children,
    key: props && props.key,
    shapeFlag: getShapeFlag(type),
  };
  if (typeof children === "string") {
    vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN;
  } else if (Array.isArray(children)) {
    vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN;
  }

  // 插槽vnode节点判断
  if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
    if (typeof children === "object") {
      vnode.shapeFlag |= ShapeFlags.SLOT_CHILDREN;
    }
  }

  return vnode;
}

// 判断vnode节点类型
function getShapeFlag(type) {
  return typeof type === "string"
    ? ShapeFlags.ELEMENT
    : ShapeFlags.STATEFUL_COMPONENT;
}

// 创建文本vnode
export function createTextVNode(text: string) {
  return createVNode(Text, {}, text);
}

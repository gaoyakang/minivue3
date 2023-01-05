import { isObject } from "../shared/index";
import { createComponentInstance, setupComponent } from "./component";

export function render(vnode, container) {
  patch(vnode, container);
}

// 为了后续递归调用这里拆分出了patch逻辑
function patch(vnode, container) {
  if (typeof vnode.type === "string") {
    // 判断vnode是不是一个element
    processElement(vnode, container);
  } else if (isObject(vnode.type)) {
    //处理component类型
    processComponent(vnode, container);
  }
}

//处理component类型的vnode
function processComponent(vnode, container) {
  //
  mountComponent(vnode, container);
}

function mountComponent(vnode: any, container) {
  // 创建组件实例(实际是个包含vnode的对象)
  const instance = createComponentInstance(vnode);
  // 组件实例设置，就是把setup结果和render挂载到组件实例上
  // 相当于为下一步处理组件实例准备数据
  setupComponent(instance);
  // 调用组件实例上的render
  setupRenderEffect(instance, container);
}

// 调用组件实例上的render
function setupRenderEffect(instance: any, container) {
  // render的内部调用了h(),它实际是createVNode()，即最终返回的是一个vnode
  const subTree = instance.render();
  // 递归调用patch，前一次调用实际是生成了App组件的vnode，这次调用是要处理render中的h调用
  patch(subTree, container);
}

//处理element类型vnode
function processElement(vnode: any, container: any) {
  mountElement(vnode, container);
}

function mountElement(vnode: any, container: any) {
  // element类型的vnode直接去创建真实的节点
  const el = document.createElement(vnode.type);
  // 添加节点内容
  const { children } = vnode;
  // 如果子节点是string，直接添加
  if (typeof children === "string") {
    el.textContent = children;
  } else if (Array.isArray(children)) {
    // 如果子节点是被放到数组里的虚拟节点，则循环调用patch
    mountChildren(vnode, container);
  }
  // 设置节点属性
  const { props } = vnode;
  for (const key in props) {
    const val = props[key];
    el.setAttribute(key, val);
  }
  // 将创建好的元素添加到页面
  container.append(el);
}

// 如果子节点是被放到数组里的虚拟节点，则循环调用patch
function mountChildren(vnode, container) {
  vnode.children.forEach((v) => {
    patch(v, container);
  });
}

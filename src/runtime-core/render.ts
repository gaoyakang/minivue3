import { ShapeFlags } from "../shared/ShapeFlags";
import { createComponentInstance, setupComponent } from "./component";
import { Fragment, Text } from "./vnode";

// 渲染vnode，根据vnode的不同类型将vnode渲染成真实浏览器元素
// 这里最开始是App根组件的vnode
export function render(vnode, container) {
  // 为了后续递归调用这里拆分出了patch逻辑
  patch(vnode, container);
}

// 为了后续递归调用这里拆分出了patch逻辑
function patch(vnode, container) {
  // vnode可能是通过传入组件对象创建
  // 也可能是通过传入html标签名称创建

  // vnode是通过传入html标签名称创建
  const { type, shapeFlag } = vnode;
  switch (type) {
    case Fragment:
      processFragment(vnode, container);
      break;
    case Text:
      processText(vnode, container);
      break;
    default:
      if (shapeFlag & ShapeFlags.ELEMENT) {
        processElement(vnode, container);
      } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
        // vnode是通过传入组件对象创建(比如最开始的根组件)
        processComponent(vnode, container);
      }
      break;
  }
}

// 处理component类型的vnode
function processComponent(vnode, container) {
  // 挂载过程
  mountComponent(vnode, container);
}

// component类型的vnode挂载过程
function mountComponent(initialVNode: any, container) {
  // 创建组件实例(实际是个包含vnode的对象)
  // 后期可能会调用与组件相关的内容，所以抽象出组件实例
  const instance = createComponentInstance(initialVNode);

  // 组件实例设置
  // 就是把组件对象上的setup结果和render挂载到组件实例上
  // 相当于为下一步处理组件实例准备数据
  setupComponent(instance);

  // 调用组件实例上的render(根组件里面创建html节点)
  setupRenderEffect(instance, initialVNode, container);
}

// 调用组件实例上的render并且将代理的setup返回的对象挂到render上
function setupRenderEffect(instance: any, initialVNode, container) {
  // 获取组件对象setup返回的对象的代理对象，挂载到render上
  // 这样render中就能访问到setup中的数据
  const { proxy } = instance;

  // render的内部调用了h(),它实际是createVNode()，即最终返回的是一个vnode
  // 该vnode可能是个component类型，也可能是element类型，需要进一步patch拆解
  // 调用call将代理的setup返回的对象挂到render上
  const subTree = instance.render.call(proxy);
  // 递归调用patch，这里的递归是在App组件解析完了后的patch
  patch(subTree, container);

  initialVNode.el = subTree.el;
}

//处理element类型vnode
function processElement(vnode: any, container: any) {
  mountElement(vnode, container);
}

function mountElement(vnode: any, container: any) {
  // 1.element类型的vnode直接去创建真实的节点
  const el = (vnode.el = document.createElement(vnode.type));

  // 2.添加节点内容
  const { children, shapeFlag } = vnode;
  // 如果子节点是string，直接添加，说明该内容就是节点终点
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    el.textContent = children;
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    // 如果子节点是被放到数组里的虚拟节点，说明el下面还有新的节点，则循环调用patch
    mountChildren(vnode, el);
  }

  // 3.设置节点属性
  const { props } = vnode;
  for (const key in props) {
    const val = props[key];

    // 处理事件
    const isOn = (key: string) => /^on[A-Z]/.test(key);
    if (isOn(key)) {
      const event = key.slice(2).toLowerCase();
      el.addEventListener(event, val);
    } else {
      el.setAttribute(key, val);
    }
  }
  // 4.将创建好的元素添加到页面
  container.append(el);
}

// 如果子节点是被放到数组里的虚拟节点，，说明el下面还有新的节点，则循环调用patch
function mountChildren(vnode, container) {
  vnode.children.forEach((v) => {
    patch(v, container);
  });
}

// 处理fragment类型节点
function processFragment(vnode: any, container: any) {
  mountChildren(vnode, container);
}

// 处理text类型节点
function processText(vnode: any, container: any) {
  const { children } = vnode;
  const textNode = (vnode.el = document.createTextNode(children));
  container.append(textNode);
}

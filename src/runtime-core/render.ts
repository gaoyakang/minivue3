import { effect } from "../reactivity/effect";
import { EMPTY_OBJ } from "../shared";
import { ShapeFlags } from "../shared/ShapeFlags";
import { createComponentInstance, setupComponent } from "./component";
import { createAppAPI } from "./createApp";
import { Fragment, Text } from "./vnode";

// 依靠渲染器实现不同平台注入
export function createRender(options) {
  const { createElement, patchProp, insert } = options;

  // 渲染vnode，根据vnode的不同类型将vnode渲染成真实浏览器元素
  // 这里最开始是App根组件的vnode
  function render(vnode, container) {
    // 为了后续递归调用这里拆分出了patch逻辑
    patch(null, vnode, container, null);
  }

  // 为了后续递归调用这里拆分出了patch逻辑
  function patch(n1, n2, container, parentComponent) {
    // vnode可能是通过传入组件对象创建
    // 也可能是通过传入html标签名称创建

    // vnode是通过传入html标签名称创建
    const { type, shapeFlag } = n2;
    switch (type) {
      case Fragment:
        processFragment(n1, n2, container, parentComponent);
        break;
      case Text:
        processText(n1, n2, container);
        break;
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, parentComponent);
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          // vnode是通过传入组件对象创建(比如最开始的根组件)
          processComponent(n1, n2, container, parentComponent);
        }
        break;
    }
  }

  // 处理component类型的vnode
  function processComponent(n1, n2, container, parentComponent) {
    // 挂载过程
    mountComponent(n2, container, parentComponent);
  }

  // component类型的vnode挂载过程
  function mountComponent(initialVNode: any, container, parentComponent) {
    // 创建组件实例(实际是个包含vnode的对象)
    // 后期可能会调用与组件相关的内容，所以抽象出组件实例
    const instance = createComponentInstance(initialVNode, parentComponent);

    // 组件实例设置
    // 就是把组件对象上的setup结果和render挂载到组件实例上
    // 相当于为下一步处理组件实例准备数据
    setupComponent(instance);

    // 调用组件实例上的render(根组件里面创建html节点)
    setupRenderEffect(instance, initialVNode, container);
  }

  // 调用组件实例上的render并且将代理的setup返回的对象挂到render上
  function setupRenderEffect(instance: any, initialVNode, container) {
    // 当setup数据变化，render中的视图也要变化
    // effect先收集相关依赖，等修改值时自动触发依赖
    effect(() => {
      // 初始化节点
      if (!instance.isMounted) {
        console.log("init");

        // 获取组件对象setup返回的对象的代理对象，挂载到render上
        // 这样render中就能访问到setup中的数据
        const { proxy } = instance;

        // render的内部调用了h(),它实际是createVNode()，即最终返回的是一个vnode
        // 该vnode可能是个component类型，也可能是element类型，需要进一步patch拆解
        // 调用call将代理的setup返回的对象挂到render上
        const subTree = (instance.subTree = instance.render.call(proxy));

        // 递归调用patch，这里的递归是在App组件解析完了后的patch
        patch(null, subTree, container, instance);

        initialVNode.el = subTree.el;

        // 初始化节点完成，下次不会再调用
        instance.isMounted = true;
      } else {
        // 更新节点
        console.log("update");
        // 获取组件对象setup返回的对象的代理对象，挂载到render上
        // 这样render中就能访问到setup中的数据
        const { proxy } = instance;

        // render的内部调用了h(),它实际是createVNode()，即最终返回的是一个vnode
        // 该vnode可能是个component类型，也可能是element类型，需要进一步patch拆解
        // 调用call将代理的setup返回的对象挂到render上
        const subTree = instance.render.call(proxy);
        const prevSubTree = instance.subTree;
        instance.subTree = subTree;
        // console.log("subtree:", subTree);
        // console.log("prevSubTree:", prevSubTree);

        patch(prevSubTree, subTree, container, instance);
      }
    });
  }

  //处理element类型vnode
  function processElement(n1: any, n2, container: any, parentComponent) {
    // 没有老节点那就初始化
    if (!n1) {
      mountElement(n2, container, parentComponent);
    } else {
      // 有老节点那就对比更新
      patchElement(n1, n2, container);
    }
  }

  // 更新比对节点
  function patchElement(n1, n2, container) {
    console.log("patchElement");
    // console.log("n1", n1);
    // console.log("n2", n2);
    const oldProps = n1.props || EMPTY_OBJ;
    const newProps = n2.props || EMPTY_OBJ;
    const el = (n2.el = n1.el);
    patchProps(el, oldProps, newProps);
  }
  // 更新props
  function patchProps(el, oldProps, newProps) {
    if (oldProps != newProps) {
      for (const key in newProps) {
        const prevProp = oldProps[key];
        const nextProp = newProps[key];
        if (prevProp != nextProp) {
          patchProp(el, key, prevProp, nextProp);
        }
      }
      if (oldProps != EMPTY_OBJ) {
        for (const key in oldProps) {
          if (!(key in newProps)) {
            patchProp(el, key, oldProps[key], null);
          }
        }
      }
    }
  }
  function mountElement(n1: any, container: any, parentComponent) {
    // 1.element类型的vnode直接去创建真实的节点
    const el = (n1.el = createElement(n1.type));

    // 2.添加节点内容
    const { children, shapeFlag } = n1;
    // 如果子节点是string，直接添加，说明该内容就是节点终点
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      el.textContent = children;
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // 如果子节点是被放到数组里的虚拟节点，说明el下面还有新的节点，则循环调用patch
      mountChildren(n1, el, parentComponent);
    }

    // 3.设置节点属性
    const { props } = n1;
    for (const key in props) {
      const val = props[key];
      // 处理事件和属性
      patchProp(el, key, null, val);
    }
    // 4.将创建好的元素添加到页面
    // container.append(el);
    insert(el, container);
  }

  // 如果子节点是被放到数组里的虚拟节点，，说明el下面还有新的节点，则循环调用patch
  function mountChildren(n1, container, parentComponent) {
    n1.children.forEach((v) => {
      patch(null, v, container, parentComponent);
    });
  }

  // 处理fragment类型节点
  function processFragment(n1: any, n2, container: any, parentComponent) {
    mountChildren(n1, container, parentComponent);
  }

  // 处理text类型节点
  function processText(n1: any, n2, container: any) {
    const { children } = n1;
    const textNode = (n1.el = document.createTextNode(children));
    container.append(textNode);
  }

  return {
    createApp: createAppAPI(render),
  };
}

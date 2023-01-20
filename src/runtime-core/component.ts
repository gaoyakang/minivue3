import { proxyRefs } from "../reactivity";
import { shallowReadonly } from "../reactivity/reactive";
import { emit } from "./componentEmit";
import { initProps } from "./componentProps";
import { PublicInstanceProxyHandlers } from "./componentPublicInstance";
import { initSlots } from "./componentSlots";

// 根据conponent类型的vnode创建组件实例
// 后期可能会调用与组件相关的内容，所以抽象出组件实例
export function createComponentInstance(vnode: any, parent) {
  // console.log("createComponentinstance", parent);
  const component = {
    vnode,
    type: vnode.type,
    setupState: {}, // setup数据相关
    props: {}, // setup的pros传参
    emit: () => {}, // 组件间事件传递
    slots: {}, //插槽
    providers: parent ? parent.providers : {}, // 提供类似vuex的存取功能
    parent,
    isMounted: false, //更新还是初始化节点,
    subTree: {}, //上次节点
  };
  component.emit = emit.bind(null, component) as any;
  return component;
}

// 把组件对象上的setup结果和render挂载到组件实例上
export function setupComponent(instance) {
  // 将props挂载到实例
  initProps(instance, instance.vnode.props);
  // 将slots挂载到实例
  initSlots(instance, instance.vnode.children);
  // 设置组件状态
  setupStateFulComponent(instance);
}

// 设置组件状态
function setupStateFulComponent(instance: any) {
  // 这里的Component指的是传入的App组件
  const Component = instance.vnode.type;
  // 为了实现在render中使用this获取全部的属性
  // 使用代理模式
  // 在render.ts的setupRenderEffect时触发
  // 为了实现在render中this访问setup中的值
  instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);

  // App组件实际上是一个包含了render和setup的对象
  const { setup } = Component;
  if (setup) {
    setCurrentInstance(instance);
    // setup执行完就会返回一个对象，这个例子中包含msg变量
    const setupResult = setup(shallowReadonly(instance.props), {
      emit: instance.emit,
    });
    setCurrentInstance(null);

    // 处理setup执行的结果
    handleSetupResult(instance, setupResult);
  }
}
// 处理setup执行的结果
function handleSetupResult(instance, setupResult: any) {
  // 如果setup最终返回的是一个对象
  if (typeof setupResult === "object") {
    // 将setup执行返回的结果挂载到组件实例上
    instance.setupState = proxyRefs(setupResult);
  }
  // 完成组件实例设置
  finishComponentSetup(instance);
}
// 完成组件实例设置
function finishComponentSetup(instance: any) {
  const Component = instance.type;
  // 将render挂载到组件实例上
  instance.render = Component.render;
}

// 获取当前实例
let currentInstance = null;
export function getCurrentInstance() {
  return currentInstance;
}

export function setCurrentInstance(instance) {
  currentInstance = instance;
}

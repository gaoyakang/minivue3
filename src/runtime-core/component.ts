import { PublicInstanceProxyHandlers } from "./componentPublicInstance";

// 根据conponent类型的vnode创建组件实例
// 后期可能会调用与组件相关的内容，所以抽象出组件实例
export function createComponentInstance(vnode: any) {
  const component = {
    vnode,
    type: vnode.type,
    setupState: {}, // 数据相关
  };
  return component;
}

// 把组件对象上的setup结果和render挂载到组件实例上
export function setupComponent(instance) {
  // initProps()
  // initSlots()
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
    // setup执行完就会返回一个对象，这个例子中包含msg变量
    const setupResult = setup();
    // 处理setup执行的结果
    handleSetupResult(instance, setupResult);
  }
}
// 处理setup执行的结果
function handleSetupResult(instance, setupResult: any) {
  // 如果setup最终返回的是一个对象
  if (typeof setupResult === "object") {
    // 将setup执行返回的结果挂载到组件实例上
    instance.setupState = setupResult;
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

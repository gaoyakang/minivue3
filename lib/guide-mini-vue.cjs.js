'use strict';

const isObject = (val) => {
    return val != undefined && typeof val === "object";
};

const publicPropertiesMap = {
    $el: (i) => i.vnode.el,
};
const PublicInstanceProxyHandlers = {
    get({ _: instance }, key) {
        const { setupState } = instance;
        if (key in setupState) {
            return setupState[key];
        }
        // key -> $el
        // if (key === "$el") {
        //   return instance.vnode.el;
        // }
        const publicGetter = publicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
    },
};

// 根据conponent类型的vnode创建实例
function createComponentInstance(vnode) {
    const component = {
        vnode,
        type: vnode.type,
        setupState: {},
    };
    return component;
}
function setupComponent(instance) {
    // initProps()
    // initSlots()
    // 设置组件状态
    setupStateFulComponent(instance);
}
// 设置组件状态
function setupStateFulComponent(instance) {
    // 这里的Component指的是传入的App组件
    const Component = instance.vnode.type;
    // 为了实现在render中使用this获取全部的属性
    // 使用代理模式
    // 在render.ts的setupRenderEffect时触发
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
function handleSetupResult(instance, setupResult) {
    // 如果setup最终返回的是一个对象
    if (typeof setupResult === "object") {
        // 将setup执行返回的结果挂载到组件实例上
        instance.setupState = setupResult;
    }
    // 完成组件实例设置
    finishComponentSetup(instance);
}
// 完成组件实例设置
function finishComponentSetup(instance) {
    const Component = instance.type;
    // 将render挂载到组件实例上
    instance.render = Component.render;
}

function render(vnode, container) {
    patch(vnode, container);
}
// 为了后续递归调用这里拆分出了patch逻辑
function patch(vnode, container) {
    if (typeof vnode.type === "string") {
        // 判断vnode是不是一个element
        processElement(vnode, container);
    }
    else if (isObject(vnode.type)) {
        //处理component类型
        processComponent(vnode, container);
    }
}
//处理component类型的vnode
function processComponent(vnode, container) {
    mountComponent(vnode, container);
}
function mountComponent(initialVNode, container) {
    // 创建组件实例(实际是个包含vnode的对象)
    const instance = createComponentInstance(initialVNode);
    // 组件实例设置，就是把setup结果和render挂载到组件实例上
    // 相当于为下一步处理组件实例准备数据
    setupComponent(instance);
    // 调用组件实例上的render
    setupRenderEffect(instance, initialVNode, container);
}
//处理element类型vnode
function processElement(vnode, container) {
    mountElement(vnode, container);
}
function mountElement(vnode, container) {
    // element类型的vnode直接去创建真实的节点
    const el = (vnode.el = document.createElement(vnode.type));
    // 添加节点内容
    const { children } = vnode;
    // 如果子节点是string，直接添加
    if (typeof children === "string") {
        el.textContent = children;
    }
    else if (Array.isArray(children)) {
        // 如果子节点是被放到数组里的虚拟节点，则循环调用patch
        mountChildren(vnode, el);
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
// 调用组件实例上的render
function setupRenderEffect(instance, initialVNode, container) {
    // 获取代理对象，挂载到render上
    const { proxy } = instance;
    // render的内部调用了h(),它实际是createVNode()，即最终返回的是一个vnode
    const subTree = instance.render.call(proxy);
    // 递归调用patch，前一次调用实际是生成了App组件的vnode，这次调用是要处理render中的h调用
    patch(subTree, container);
    initialVNode.el = subTree.el;
}

// 创建虚拟节点
// type：需要处理的是什么类型component还是element
function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        el: null,
    };
    return vnode;
}

// rootComponent可能式传入的App组件
function createApp(rootComponent) {
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

function h(type, props, children) {
    return createVNode(type, props, children);
}

exports.createApp = createApp;
exports.h = h;

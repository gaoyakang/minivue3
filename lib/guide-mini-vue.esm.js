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

// 根据conponent类型的vnode创建组件实例
// 后期可能会调用与组件相关的内容，所以抽象出组件实例
function createComponentInstance(vnode) {
    const component = {
        vnode,
        type: vnode.type,
        setupState: {}, // 数据相关
    };
    return component;
}
// 把组件对象上的setup结果和render挂载到组件实例上
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

// 渲染vnode，根据vnode的不同类型将vnode渲染成真实浏览器元素
// 这里最开始是App根组件的vnode
function render(vnode, container) {
    // 为了后续递归调用这里拆分出了patch逻辑
    patch(vnode, container);
}
// 为了后续递归调用这里拆分出了patch逻辑
function patch(vnode, container) {
    // vnode可能是通过传入组件对象创建
    // 也可能是通过传入html标签名称创建
    // vnode是通过传入html标签名称创建
    const { shapeFlag } = vnode;
    if (shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
        processElement(vnode, container);
    }
    else if (shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
        // vnode是通过传入组件对象创建(比如最开始的根组件)
        processComponent(vnode, container);
    }
}
// 处理component类型的vnode
function processComponent(vnode, container) {
    // 挂载过程
    mountComponent(vnode, container);
}
// component类型的vnode挂载过程
function mountComponent(initialVNode, container) {
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
function setupRenderEffect(instance, initialVNode, container) {
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
function processElement(vnode, container) {
    mountElement(vnode, container);
}
function mountElement(vnode, container) {
    // 1.element类型的vnode直接去创建真实的节点
    const el = (vnode.el = document.createElement(vnode.type));
    // 2.添加节点内容
    const { children } = vnode;
    // 如果子节点是string，直接添加，说明该内容就是节点终点
    const { shapeFlag } = vnode;
    if (shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
        el.textContent = children;
    }
    else if (shapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
        // 如果子节点是被放到数组里的虚拟节点，说明el下面还有新的节点，则循环调用patch
        mountChildren(vnode, el);
    }
    // 3.设置节点属性
    const { props } = vnode;
    for (const key in props) {
        const val = props[key];
        el.setAttribute(key, val);
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

// 创建虚拟节点
// type：需要处理的是什么类型component还是element
function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        el: null,
        shapeFlag: getShapeFlag(type),
    };
    if (typeof children === "string") {
        vnode.shapeFlag |= 4 /* ShapeFlags.TEXT_CHILDREN */;
    }
    else if (Array.isArray(children)) {
        vnode.shapeFlag |= 8 /* ShapeFlags.ARRAY_CHILDREN */;
    }
    return vnode;
}
// 判断vnode节点类型
function getShapeFlag(type) {
    return typeof type === "string"
        ? 1 /* ShapeFlags.ELEMENT */
        : 2 /* ShapeFlags.STATEFUL_COMPONENT */;
}

// rootComponent是传入的App根组件
function createApp(rootComponent) {
    return {
        // 1.component转化vnode
        mount(rootContainer) {
            // 创建虚拟根节点(包含type,props,children...属性的对象)
            const vnode = createVNode(rootComponent);
            // 渲染vnode，根据vnode的不同类型将vnode渲染成真实浏览器元素
            render(vnode, rootContainer);
        },
    };
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

export { createApp, h };

const extend = Object.assign;
const isObject = (val) => {
    return val != undefined && typeof val === "object";
};
const hasOwn = (val, key) => Object.prototype.hasOwnProperty.call(val, key);
// 转化成驼峰命名
const camelize = (str) => {
    return str.replace(/-(\w)/g, (_, c) => {
        return c ? c.toUpperCase() : "";
    });
};
// 将str中on后首字母转换成大写
const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};
const toHandlerKey = (str) => {
    return str ? "on" + capitalize(str) : "";
};

// 收集依赖（依赖就是指带fn的那个实例对象）
// 设计数据结构：
// 1.可能会存在多个对象需要追踪，所以必须要一个存放这些对象的容器targetMap
// 2.一个对象可能会存在多个key需要追踪，所以必须要一个存放这些对象的key的依赖的容器depsMap
const targetMap = new Map();
// 触发依赖
function trigger(target, key) {
    let depsMap = targetMap.get(target);
    let dep = depsMap.get(key);
    triggerEffects(dep);
}
function triggerEffects(dep) {
    for (const effect of dep) {
        if (effect.scheduler) {
            effect.scheduler();
        }
        else {
            effect.run();
        }
    }
}

// 全局初始化一次，不需要重复调用
const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
// 抽离get函数，并且区分是否位readonly模式
function createGetter(isReadonly = false, shallow = false) {
    return function get(target, key) {
        // 用于检测当前target是否为reactive
        if (key === "__V_isReactive" /* ReactiveFlags.IS_REACTIVE */) {
            return !isReadonly;
        }
        else if (key === "__V_isReadonly" /* ReactiveFlags.IS_READONLY */) {
            return isReadonly;
        }
        // Reflect从target中获取对应key的值
        const res = Reflect.get(target, key);
        if (shallow) {
            return res;
        }
        if (isObject(res)) {
            return isReadonly ? readonly(res) : reactive(res);
        }
        // 返回获取到的属性值
        return res;
    };
}
// 抽离set函数
function createSetter() {
    return function set(target, key, value) {
        // Reflect在target上获取对应key的值
        const res = Reflect.set(target, key, value);
        // 触发依赖
        trigger(target, key);
        // 返回设置好的属性值
        return res;
    };
}
// 抽离了响应式proxy的处理器
const mutableHandlers = {
    // 当调用对象属性时自动触发
    get,
    // 当设置对象属性时自动触发
    set
};
// 抽离了只读proxy的处理器
const readonlyHandlers = {
    // 当调用对象属性时自动触发
    get: readonlyGet,
    // 当设置对象属性时自动触发
    set(target, key, value) {
        console.warn(`key:${key} set 失败，因为target 是 readonly`, target);
        return true;
    }
};
// 抽离了只读浅层劫持proxy的处理器
const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
    get: shallowReadonlyGet
});

function reactive(raw) {
    // 通过proxy劫持原对象，get/set操作对象属性
    // 具体逻辑抽离到了baseHandler中
    return createActiveObject(raw, mutableHandlers);
}
function readonly(raw) {
    // 通过proxy劫持原对象，get/set操作对象属性
    // 具体逻辑抽离到了baseHandler中
    return createActiveObject(raw, readonlyHandlers);
}
function shallowReadonly(raw) {
    // 通过proxy劫持原对象，get/set操作对象属性
    // 具体逻辑抽离到了baseHandler中
    return createActiveObject(raw, shallowReadonlyHandlers);
}
function createActiveObject(raw, baseHandlers) {
    if (!isObject(raw)) {
        console.warn(`target ${raw} 必须是一个对象`);
        return raw;
    }
    // 通过proxy劫持原对象，get/set操作对象属性
    // 具体逻辑抽离到了baseHandler中
    // 这层抽离是为了加强语义化
    return new Proxy(raw, baseHandlers);
}

function emit(instance, event, ...args) {
    console.log("emit", event);
    const { props } = instance;
    const handlerName = toHandlerKey(camelize(event));
    // 获取到props传来的onxxx属性
    const handler = props[handlerName];
    handler && handler(...args);
}

function initProps(instance, rawProps) {
    instance.props = rawProps || {};
}

const publicPropertiesMap = {
    $el: (i) => i.vnode.el,
};
const PublicInstanceProxyHandlers = {
    get({ _: instance }, key) {
        const { setupState, props } = instance;
        if (key in setupState) {
            return setupState[key];
        }
        if (hasOwn(setupState, key)) {
            return setupState[key];
        }
        else if (hasOwn(props, key)) {
            return props[key];
        }
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
        setupState: {},
        props: {},
        emit: () => { }, // 组件间事件传递
    };
    component.emit = emit.bind(null, component);
    return component;
}
// 把组件对象上的setup结果和render挂载到组件实例上
function setupComponent(instance) {
    // 将props挂载到实例
    initProps(instance, instance.vnode.props);
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
        const setupResult = setup(shallowReadonly(instance.props), {
            emit: instance.emit,
        });
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
    const { children, shapeFlag } = vnode;
    // 如果子节点是string，直接添加，说明该内容就是节点终点
    if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
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
        // 处理事件
        const isOn = (key) => /^on[A-Z]/.test(key);
        if (isOn(key)) {
            const event = key.slice(2).toLowerCase();
            el.addEventListener(event, val);
        }
        else {
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

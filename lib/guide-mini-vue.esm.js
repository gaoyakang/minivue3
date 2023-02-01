// 创建虚拟节点
const Fragment = Symbol("Fragment");
const Text = Symbol("Text");
// type：需要处理的是什么类型component还是element
function createVNode(type, props, children) {
    const vnode = {
        el: null,
        component: null,
        type,
        props: props || {},
        children,
        key: props && props.key,
        shapeFlag: getShapeFlag(type),
    };
    if (typeof children === "string") {
        vnode.shapeFlag |= 4 /* ShapeFlags.TEXT_CHILDREN */;
    }
    else if (Array.isArray(children)) {
        vnode.shapeFlag |= 8 /* ShapeFlags.ARRAY_CHILDREN */;
    }
    // 插槽vnode节点判断
    if (vnode.shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
        if (typeof children === "object") {
            vnode.shapeFlag |= 16 /* ShapeFlags.SLOT_CHILDREN */;
        }
    }
    return vnode;
}
// 判断vnode节点类型
function getShapeFlag(type) {
    return typeof type === "string"
        ? 1 /* ShapeFlags.ELEMENT */
        : 2 /* ShapeFlags.STATEFUL_COMPONENT */;
}
// 创建文本vnode
function createTextVNode(text) {
    return createVNode(Text, {}, text);
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

function renderSlots(slots, name, props) {
    const slot = slots[name];
    if (slot) {
        if (typeof slot === "function") {
            return createVNode(Fragment, {}, slot(props));
        }
    }
}

const extend = Object.assign;
const EMPTY_OBJ = {};
const isObject = (val) => {
    return val != undefined && typeof val === "object";
};
const hasChanged = (val, newVal) => {
    return !Object.is(val, newVal);
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

let activeEffect, shouldTrack;
// 对象的依赖
class ReactiveEffect {
    constructor(fn, scheduler) {
        this.scheduler = scheduler;
        // activeEffect是依赖对象，deps是依赖对象的一个数组属性，用于存放后续可能会被删除的依赖
        this.deps = [];
        // 为了避免多次调用stop，因为调用一次就已经把依赖删除了，不用多次调用
        this.active = true;
        this._fn = fn;
    }
    // 执行reactive()传入的函数
    run() {
        if (!this.active) {
            return this._fn();
        }
        shouldTrack = true;
        activeEffect = this;
        const result = this._fn();
        shouldTrack = false;
        return result;
    }
    // 删除对应依赖
    stop() {
        // 为了避免多次调用stop造成性能影响
        if (this.active) {
            // 清除依赖
            cleanupEffect(this);
            // 调用回调函数onStop
            if (this.onStop) {
                this.onStop();
            }
            this.active = false;
        }
    }
}
// 清除依赖的函数
function cleanupEffect(effect) {
    effect.deps.forEach((dep) => {
        dep.delete(effect);
    });
    effect.deps.length = 0;
}
// 收集依赖（依赖就是指带fn的那个实例对象）
// 设计数据结构：
// 1.可能会存在多个对象需要追踪，所以必须要一个存放这些对象的容器targetMap
// 2.一个对象可能会存在多个key需要追踪，所以必须要一个存放这些对象的key的依赖的容器depsMap
const targetMap = new Map();
function track(target, key) {
    // target -> depsMap -> key
    if (!isTracking())
        return;
    // 1.选择对象
    let depsMap = targetMap.get(target);
    // 初始化时创建depsMap放到targetMap
    if (!depsMap) {
        depsMap = new Map();
        targetMap.set(target, depsMap);
    }
    // 2.选择对象的key对应存储的依赖
    let dep = depsMap.get(key);
    // 初始化时创建dep放到depsMap
    if (!dep) {
        // dep用来存储依赖
        dep = new Set();
        depsMap.set(key, dep);
    }
    // 将依赖加入，实际存储的就是fn
    trackEffects(dep);
}
function trackEffects(dep) {
    // 如果已经收集过依赖则直接返回
    if (dep.has(activeEffect))
        return;
    // 没有被收集过则将其添加到依赖收集的数组中
    // console.log(activeEffect)
    dep.add(activeEffect);
    // activeEffect是依赖对象，deps是依赖对象的一个数组属性，用于存放后续可能会被删除的依赖
    activeEffect.deps.push(dep);
}
function isTracking() {
    // if(!activeEffect) return;
    // if(!shouldTrack) return;
    return shouldTrack && activeEffect != undefined;
}
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
// effect包裹的内容被自动调用
function effect(fn, options = {}) {
    // 新建ReactiveEffect是为了使用面向对象编程
    const _effect = new ReactiveEffect(fn, options.scheduler);
    // 将options内容挂载到_effect上
    extend(_effect, options);
    // 调用reactive()传入的函数
    _effect.run();
    const runner = _effect.run.bind(_effect);
    runner.effect = _effect; // stop中使用
    return runner;
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
        // readonly模式不能set也就没有必要去收集依赖
        if (!isReadonly) {
            // 依赖收集
            track(target, key);
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

class RefImpl {
    constructor(value) {
        // 判断是否为ref
        this.__v_isRef = true;
        this._rawValue = value;
        // 判断是value是普通型还是引用型
        this._value = convert(value);
        // 依赖实际存放的地方
        this.dep = new Set();
    }
    get value() {
        // 依赖收集
        trackRefValue(this);
        return this._value;
    }
    set value(newValue) {
        // 判断传入的值和以前的值是否一样，如果改变了就去触发依赖
        if (hasChanged(newValue, this._rawValue)) {
            this._rawValue = newValue;
            // 判断是普通型还是是引用型
            this._value = convert(newValue);
            // 触发依赖
            triggerEffects(this.dep);
        }
    }
}
function convert(value) {
    // 如果value是普通型直接返回该值
    // 如果value是引用型经reactive包裹后返回
    // console.log(isObject(value))
    return isObject(value) ? reactive(value) : value;
}
function trackRefValue(ref) {
    // 判断需不需要追踪
    if (isTracking()) {
        // 收集依赖
        // ref指的是RefImpl的实例，dep是依赖存放的地方
        trackEffects(ref.dep);
    }
}
function ref(value) {
    return new RefImpl(value);
}
function isRef(ref) {
    return !!ref.__v_isRef;
}
function unRef(ref) {
    return isRef(ref) ? ref.value : ref;
}
function proxyRefs(objectWithRef) {
    return new Proxy(objectWithRef, {
        get(target, key) {
            return unRef(Reflect.get(target, key));
        },
        set(target, key, value) {
            if (isRef(target[key]) && !isRef(value)) {
                return (target[key].value = value);
            }
            else {
                return Reflect.set(target, key, value);
            }
        },
    });
}

function emit(instance, event, ...args) {
    console.log("emit", event);
    // event可能是add形式，也可能是add-foo形式
    const { props } = instance;
    // camelize将add-foo形式转换成addFoo形式
    // toHandlerKey组合事件为onxxx的形式
    const handlerName = toHandlerKey(camelize(event));
    // 获取到props传来的onxxx事件
    const handler = props[handlerName];
    // 触发事件并将事件的参数传入
    handler && handler(...args);
}

function initProps(instance, rawProps) {
    instance.props = rawProps || {};
}

const publicPropertiesMap = {
    $el: (i) => i.vnode.el,
    $slots: (i) => i.slots,
    $props: (i) => i.props,
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

function initSlots(instance, children) {
    const { vnode } = instance;
    if (vnode.shapeFlag & 16 /* ShapeFlags.SLOT_CHILDREN */) {
        normalizeObjectSlots(children, instance.slots);
    }
}
function normalizeObjectSlots(children, slots) {
    for (const key in children) {
        const value = children[key];
        slots[key] = (props) => normalizeSlotValue(value(props));
    }
}
function normalizeSlotValue(value) {
    return Array.isArray(value) ? value : [value];
}

// 根据conponent类型的vnode创建组件实例
// 后期可能会调用与组件相关的内容，所以抽象出组件实例
function createComponentInstance(vnode, parent) {
    // console.log("createComponentinstance", parent);
    const component = {
        vnode,
        type: vnode.type,
        next: null,
        setupState: {},
        props: {},
        emit: () => { },
        slots: {},
        providers: parent ? parent.providers : {},
        parent,
        isMounted: false,
        subTree: {}, //上次节点
    };
    component.emit = emit.bind(null, component);
    return component;
}
// 把组件对象上的setup结果和render挂载到组件实例上
function setupComponent(instance) {
    // 将props挂载到实例
    initProps(instance, instance.vnode.props);
    // 将slots挂载到实例
    initSlots(instance, instance.vnode.children);
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
function handleSetupResult(instance, setupResult) {
    // 如果setup最终返回的是一个对象
    if (typeof setupResult === "object") {
        // 将setup执行返回的结果挂载到组件实例上
        instance.setupState = proxyRefs(setupResult);
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
// 获取当前实例
let currentInstance = null;
function getCurrentInstance() {
    return currentInstance;
}
function setCurrentInstance(instance) {
    currentInstance = instance;
}

// 存
function provide(key, value) {
    const currentInstance = getCurrentInstance();
    // provides必须在setup中调用
    if (currentInstance) {
        let { providers } = currentInstance;
        const parentProviders = currentInstance.parent.providers;
        // 初始化
        if (providers === parentProviders) {
            providers = currentInstance.providers = Object.create(parentProviders);
        }
        providers[key] = value;
    }
}
// 取
function inject(key, defaultValue) {
    const currentInstance = getCurrentInstance();
    // provides必须在setup中调用
    if (currentInstance) {
        const parentProviders = currentInstance.parent.providers;
        if (key in parentProviders) {
            return parentProviders[key];
        }
        else if (defaultValue) {
            if (typeof defaultValue === "function") {
                return defaultValue();
            }
            return defaultValue;
        }
    }
}

function shouldUpdateComponent(prevVNode, nextVNode) {
    const { props: prevProps } = prevVNode;
    const { props: nextProps } = nextVNode;
    for (const key in nextProps) {
        if (nextProps[key] != prevProps[key]) {
            return true;
        }
        return false;
    }
}

// 这里的render是render.ts中的render函数
function createAppAPI(render) {
    // rootComponent是传入的App根组件
    return function createApp(rootComponent) {
        return {
            // 1.component转化vnode
            // rootContainer是#app节点
            mount(rootContainer) {
                // 创建虚拟根节点(包含type,props,children...属性的对象)
                const vnode = createVNode(rootComponent);
                // 渲染vnode，根据vnode的不同类型将vnode渲染成真实浏览器元素
                render(vnode, rootContainer);
            },
        };
    };
}

// 依靠渲染器实现不同平台注入
function createRender(options) {
    // 获取不同平台的操作api
    const { createElement, patchProp, insert, remove, setElementText } = options;
    // 渲染vnode，根据vnode的不同类型将vnode渲染成真实浏览器元素
    // 这里最开始是App根组件的vnode
    function render(vnode, container) {
        // 为了后续递归调用这里拆分出了patch逻辑
        // patch的各个参数含义：
        // 1.n1：老节点，最开始是根节点，不会有老节点，所以这里是null
        // 2.n2：新节点,这里传入的vnode是最开始的根组件生成的虚拟节点
        // 3.container：挂载到dom中的位置"#app"
        // 4.parentComponent：父级组件？？
        // 5.anchor：更新节点时需要插入的位置
        patch(null, vnode, container, null, null);
    }
    // 为了后续递归调用这里拆分出了patch逻辑
    function patch(n1, n2, container, parentComponent, anchor) {
        // 取出新节点n2的type判断节点是哪种类型
        // Fragment类型：避免div标签嵌套
        // Text类型：直接为纯文本
        // Element类型：通过html元素名称创建
        // Component类型：组件类型
        const { type, shapeFlag } = n2;
        switch (type) {
            case Fragment:
                processFragment(n1, n2, container, parentComponent, anchor);
                break;
            case Text:
                processText(n1, n2, container);
                break;
            default:
                if (shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
                    processElement(n1, n2, container, parentComponent, anchor);
                }
                else if (shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
                    // vnode是通过传入组件对象创建(比如最开始的根组件，此时n1老节点是null)
                    processComponent(n1, n2, container, parentComponent, anchor);
                }
                break;
        }
    }
    // 处理component类型的vnode
    function processComponent(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            // 挂载过程
            // 挂载根节点前n1老节点还不存在
            mountComponent(n2, container, parentComponent, anchor);
        }
        else {
            updateComponent(n1, n2);
        }
    }
    // 组件更新逻辑
    function updateComponent(n1, n2) {
        const instance = (n2.component = n1.component);
        if (shouldUpdateComponent(n1, n2)) {
            instance.next = n2;
            instance.update();
        }
        else {
            n2.el = n1.el;
            instance.vnode = n2;
        }
    }
    // component类型的vnode挂载过程
    function mountComponent(initialVNode, container, parentComponent, anchor) {
        // 创建组件实例(实际是个包含vnode的对象)
        // 后期可能会调用与组件相关的内容，所以抽象出组件实例
        const instance = (initialVNode.component = createComponentInstance(initialVNode, parentComponent));
        // 组件实例设置
        // 就是把组件对象上的setup结果和render挂载到组件实例上
        // 相当于为下一步处理组件实例准备数据
        setupComponent(instance);
        // 调用组件实例上的render(根组件里面创建html节点)
        setupRenderEffect(instance, initialVNode, container, anchor);
    }
    // 调用组件实例上的render并且将代理的setup返回的对象挂到render上
    function setupRenderEffect(instance, initialVNode, container, anchor) {
        // 当setup数据变化，render中的视图也要变化
        // effect先收集相关依赖，等修改值时自动触发依赖
        instance.update = effect(() => {
            // 初始化节点
            if (!instance.isMounted) {
                // console.log("init");
                // 获取组件对象setup返回的对象的代理对象，挂载到render上
                // 这样render中就能访问到setup中的数据
                const { proxy } = instance;
                // render的内部调用了h(),它实际是createVNode()，即最终返回的是一个vnode
                // 该vnode可能是个component类型，也可能是element类型，需要进一步patch拆解
                // 调用call将代理的setup返回的对象挂到render上
                const subTree = (instance.subTree = instance.render.call(proxy));
                // 递归调用patch，这里的递归是在App组件解析完了后的patch
                patch(null, subTree, container, instance, anchor);
                initialVNode.el = subTree.el;
                // 初始化节点完成，下次不会再调用
                instance.isMounted = true;
            }
            else {
                // 更新节点
                // 组件相关
                const { next, vnode } = instance;
                if (next) {
                    next.el = vnode.el;
                    updateComponentPreRender(instance, next);
                }
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
                patch(prevSubTree, subTree, container, instance, anchor);
            }
        });
    }
    //处理element类型vnode
    function processElement(n1, n2, container, parentComponent, anchor) {
        // 没有老节点那就初始化
        if (!n1) {
            mountElement(n2, container, parentComponent, anchor);
        }
        else {
            // 有老节点那就对比更新
            patchElement(n1, n2, container, parentComponent, anchor);
        }
    }
    function mountElement(n1, container, parentComponent, anchor) {
        // 1.element类型的vnode直接去创建真实的节点
        const el = (n1.el = createElement(n1.type));
        // 2.添加节点内容
        const { children, shapeFlag } = n1;
        // 如果子节点是string，直接添加，说明该内容就是节点终点
        if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            el.textContent = children;
        }
        else if (shapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
            // 如果子节点是被放到数组里的虚拟节点，说明el下面还有新的节点，则循环调用patch
            mountChildren(n1.children, el, parentComponent, anchor);
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
        insert(el, container, anchor);
    }
    // 更新比对节点
    function patchElement(n1, n2, container, parentComponent, anchor) {
        // console.log("patchElement");
        // console.log("n1", n1);
        // console.log("n2", n2);
        const oldProps = n1.props || EMPTY_OBJ;
        const newProps = n2.props || EMPTY_OBJ;
        const el = (n2.el = n1.el);
        // 更新子节点
        patchChildren(n1, n2, el, parentComponent, anchor);
        // 更新属性
        patchProps(el, oldProps, newProps);
    }
    //更新子节点
    function patchChildren(n1, n2, container, parentComponent, anchor) {
        // n1老的节点，n2新的节点
        const prevShapeFlag = n1.shapeFlag;
        const c1 = n1.children;
        const { shapeFlag } = n2;
        const c2 = n2.children;
        // n2新节点的children是文本类型
        if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            // n1老节点的children是数组类型，即数组换文本
            if (prevShapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
                // ArrayToText
                // 1.把老的数组类型children清空
                console.log("老节点数组，新节点文本");
                unmountChildren(n1.children);
            }
            // n1老节点的children是文本类型，即文本换文本
            if (c1 != c2) {
                // TextToText和ArrayToText都用了这里文本替代的逻辑
                // 2.将新的文本类型children设置text
                console.log("老节点文本，新节点文本");
                setElementText(container, c2);
            }
            // =================上面类型是：旧节点是文本或数组，新节点是文本==============
            // =================下面类型是：旧节点是文本或数组，新节点是数组==============
        }
        else {
            // TextToArray
            // n1老节点的children是文本类型，即数组换文本
            // n2新节点的children是数组类型
            if (prevShapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
                console.log("老节点文本，新节点数组");
                // 先把老节点的文本清空
                setElementText(container, "");
                // 将新节点换成数组类型
                mountChildren(c2, container, parentComponent, anchor);
            }
            else {
                // ArrayToArray
                // n1老节点的children是数组类型
                // n2新节点的children是数组类型
                console.log("老节点数组，新节点数组");
                patchKeyedChildren(c1, c2, container, parentComponent, anchor);
            }
        }
    }
    // ArrayToArray双端对比算法
    function patchKeyedChildren(c1, c2, container, parentComponent, parentAnchor) {
        const l2 = c2.length;
        // i是移动的指针位置
        let i = 0;
        // e1是老节点最后位置
        let e1 = c1.length - 1;
        // e2是新节点最后位置
        let e2 = l2 - 1;
        // 比对2个节点是否一样的工具函数
        function isSomeVNodeType(n1, n2) {
            return n1.type === n2.type && n1.key === n2.key;
        }
        // 一：先进行左右2端对比
        // 1.左侧对比
        console.log("开始左端对比....");
        while (i <= e1 && i <= e2) {
            // c1是老节点数组
            const n1 = c1[i];
            // c2是新节点数组
            const n2 = c2[i];
            // 如果新老节点的children中2个虚拟节点一样
            if (isSomeVNodeType(n1, n2)) {
                // 一直向后比较直到出现不一样的
                patch(n1, n2, container, parentComponent, parentAnchor);
            }
            else {
                // 如果新老节点的children中2个虚拟节点不一样
                // 说明已经找到左侧位置，需要退出循环，记录此时的i位置
                break;
            }
            i++;
        }
        console.log("对比结果:");
        console.log("当前i位置:", i);
        console.log("当前e1位置:", e1);
        console.log("当前e2位置:", e2);
        console.log("开始右端对比....");
        // 2.右侧对比
        // 此时的i是新老节点左侧不同节点的位置
        while (i <= e1 && i <= e2) {
            const n1 = c1[e1];
            const n2 = c2[e2];
            // 如果新老节点的children中2个虚拟节点一样
            if (isSomeVNodeType(n1, n2)) {
                patch(n1, n2, container, parentComponent, parentAnchor);
            }
            else {
                // 如果新老节点的children中2个虚拟节点不一样
                // 说明已经找到右侧位置，需要退出循环，记录此时的e1和e2位置
                break;
            }
            e1--;
            e2--;
        }
        console.log("对比结果:");
        console.log("当前i位置:", i);
        console.log("当前e1位置:", e1);
        console.log("当前e2位置:", e2);
        // 此时已经找出：
        // 1.左侧新老节点不同的位置是i
        // 2.右侧老节点不同的位置是e1
        // 3.右侧新节点不同的位置是e2
        // 二：在确定的范围内对比
        // 3.新的比老的长左侧(前面只是比对找出位置，这里多出来的还需要创建)
        if (i > e1 && i <= e2) {
            // 新节点的数量大于旧节点的数量
            const nextPos = e2 + 1;
            const anchor = nextPos < l2 ? c2[nextPos].el : null;
            while (i <= e2) {
                patch(null, c2[i], container, parentComponent, anchor);
                i++;
            }
        }
        else if (i > e2 && i <= e1) {
            // 新节点的数量是小于旧节点的数量的
            // 5.老的比新的长(左侧)删除
            while (i <= e1) {
                remove(c1[i].el);
                i++;
            }
        }
        else {
            // 中间乱序
            // 1.删除老节点有的新节点没的
            // 1.1 循环新节点数组,将新节点的key和位置存到keyToNewIndexMap
            // 1.2 循环老节点数组,判断老节点key在keyToNewIndexMap是否存在
            // 1.2.1 存在:取出该节点在新节点数组中的位置存到newIndex
            // 1.2.2 不存在:重新遍历新节点数组找到2个节点不同的位置存到newIndex
            // 1.3 newIndex判断:
            // 1.3.1 不存在则删除节点
            // 1.3.2 存在则判断是否需要移动位置
            // 1.3.2.1 建立新老节点children中间乱序部分的节点位置对照表newIndexToOldIndexMap
            // 1.4
            // 中间对比删除老节点，因为在老节点中有但在新节点中没有
            let s1 = i;
            let s2 = i;
            // 检测完的后面还有节点，直接删除
            const toBePatched = e2 - s2 + 1;
            // 当前已经处理的节点数量
            let patched = 0;
            // 新节点的key和位置对照表
            const keyToNewIndexMap = new Map();
            // 建立新老节点children中间乱序部分的节点位置对照表
            const newIndexToOldIndexMap = new Array(toBePatched);
            // 判断是否需要求最大递增子序列
            let moved = false;
            let maxNewIndexSoFar = 0;
            // 初始化newIndexToOldIndexMap
            for (let i = 0; i < toBePatched; i++) {
                newIndexToOldIndexMap[i] = 0;
            }
            // 1.遍历新节点的children中间部分
            // 将节点的key和位置i对应起来
            for (let i = s2; i <= e2; i++) {
                const nextChild = c2[i];
                keyToNewIndexMap.set(nextChild.key, i);
            }
            // 2.遍历老节点的children中间部分
            // 判断老节点的key是否在新节点映射表里面
            // 如果在新节点映射表里，取出对应的下标位置
            // 如果不在新节点映射表里，需要重新遍历
            for (let i = s1; i <= e1; i++) {
                const prevChild = c1[i];
                // 优化
                if (patched >= toBePatched) {
                    remove(prevChild.el);
                    continue;
                }
                let newIndex;
                // 用户写节点的key了
                if (prevChild.key != null) {
                    // 取出旧节点在新节点数组中位置
                    newIndex = keyToNewIndexMap.get(prevChild.key);
                }
                else {
                    // 用户没写节点的key，在映射表里就不会存在
                    // 需要遍历新节点逐个与老节点对比直到找到新老节点一样的位置，说明新老节点数组里都有该节点
                    for (let j = s2; j <= e2; j++) {
                        if (isSomeVNodeType(prevChild, c2[j])) {
                            newIndex = j;
                            break;
                        }
                    }
                }
                // newIndex是undefined时说明新节点数组中不存在该老节点
                // 需要删除
                if (newIndex === undefined) {
                    remove(prevChild.el);
                }
                else {
                    // 移动逻辑优化
                    if (newIndex >= maxNewIndexSoFar) {
                        maxNewIndexSoFar = newIndex;
                    }
                    else {
                        moved = true;
                    }
                    // 建立新老节点children中间乱序部分的节点位置对照表
                    newIndexToOldIndexMap[newIndex - s2] = i + 1;
                    patch(prevChild, c2[newIndex], container, parentComponent, null);
                    // 每处理完一个就记录一次
                    patched++;
                }
            }
            // 获取最长递增子序列
            const increasingNewIndexSequence = moved
                ? getSequence(newIndexToOldIndexMap)
                : [];
            let j = increasingNewIndexSequence.length - 1;
            // 对比newIndexToOldIndexMap
            for (let i = toBePatched - 1; i >= 0; i--) {
                // 准备移动逻辑时需要的插入位置
                const nextIndex = i + s2;
                const nextChild = c2[nextIndex];
                const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : null;
                // 中间乱序的新增逻辑
                if (newIndexToOldIndexMap[i] === 0) {
                    patch(null, nextChild, container, parentComponent, anchor);
                }
                else if (moved) {
                    // 中间乱序的移动逻辑
                    if (j < 0 || i != increasingNewIndexSequence[j]) {
                        // console.log("移动位置");
                        insert(nextChild.el, container, anchor);
                    }
                    else {
                        j--;
                    }
                }
            }
        }
    }
    function unmountChildren(children) {
        for (let i = 0; i < children.length; i++) {
            const el = children[i].el;
            remove(el);
        }
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
    // 如果子节点是被放到数组里的虚拟节点，，说明el下面还有新的节点，则循环调用patch
    function mountChildren(children, container, parentComponent, anchor) {
        children.forEach((v) => {
            patch(null, v, container, parentComponent, anchor);
        });
    }
    // 处理fragment类型节点
    function processFragment(n1, n2, container, parentComponent, anchor) {
        mountChildren(n2.children, container, parentComponent, anchor);
    }
    // 处理text类型节点
    function processText(n1, n2, container) {
        const { children } = n1;
        const textNode = (n1.el = document.createTextNode(children));
        container.append(textNode);
    }
    return {
        createApp: createAppAPI(render),
    };
}
function updateComponentPreRender(instance, nextVNode) {
    instance.vnode = nextVNode;
    instance.next = null;
    instance.props = nextVNode.props;
}
// 最长递增子序列
function getSequence(arr) {
    const p = arr.slice();
    const result = [0];
    let i, j, u, v, c;
    const len = arr.length;
    for (i = 0; i < len; i++) {
        const arrI = arr[i];
        if (arrI !== 0) {
            j = result[result.length - 1];
            if (arr[j] < arrI) {
                p[i] = j;
                result.push(i);
                continue;
            }
            u = 0;
            v = result.length - 1;
            while (u < v) {
                c = (u + v) >> 1;
                if (arr[result[c]] < arrI) {
                    u = c + 1;
                }
                else {
                    v = c;
                }
            }
            if (arrI < arr[result[u]]) {
                if (u > 0) {
                    p[i] = result[u - 1];
                }
                result[u] = i;
            }
        }
    }
    u = result.length;
    v = result[u - 1];
    while (u-- > 0) {
        result[u] = v;
        v = p[v];
    }
    return result;
}

function createElement(type) {
    return document.createElement(type);
}
function patchProp(el, key, prevVal, nextVal) {
    const isOn = (key) => /^on[A-Z]/.test(key);
    if (isOn(key)) {
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, nextVal);
    }
    else {
        if (nextVal === undefined || nextVal === null) {
            el.removeAttribute(key);
        }
        else {
            el.setAttribute(key, nextVal);
        }
    }
}
function insert(child, parent, anchor) {
    // parent.append(el);
    parent.insertBefore(child, anchor || null);
}
function remove(child) {
    const parent = child.parentNode;
    if (parent) {
        parent.removeChild(child);
    }
}
function setElementText(el, text) {
    el.textContent = text;
}
const render = createRender({
    createElement,
    patchProp,
    insert,
    remove,
    setElementText,
});
// 包装了渲染器的api
// ...args是用户传来的参数
function createApp(...args) {
    // 实际调用了runtime-core的render.ts中的createRender
    // 它返回{ createApp: createAppAPI(render) }
    return render.createApp(...args);
}

export { createApp, createRender, createTextVNode, getCurrentInstance, h, inject, provide, proxyRefs, ref, renderSlots };

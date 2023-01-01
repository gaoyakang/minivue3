
class ReactiveEffect {
    private _fn: any;
    constructor(fn){
        this._fn = fn;
    }

    run(){
        activeEffect = this;
        this._fn()
    }
}
// 收集依赖（依赖就是指带fn的那个实例对象）
// targetMap {
//   target:depsMap
//}
// depsMap {
//   key:dep
//}
const targetMap = new Map();
export function track(target, key) {
    // target -> depsMap -> key
    let depsMap = targetMap.get(target);
    // 初始化时创建depsMap放到targetMap
    if(!depsMap){
        depsMap = new Map();
        targetMap.set(target, depsMap);
    }

    let dep = depsMap.get(key)
    // 初始化时创建dep放到depsMap
    if(!dep){
        dep = new Set();
        depsMap.set(key, dep)
    }
    dep.add(activeEffect)
}

// 触发依赖
// targetMap {
//   target:depsMap
//}
// depsMap {
//   key:dep
//}
export function trigger(target, key){
    let depsMap = targetMap.get(target);
    let dep = depsMap.get(key);
    for (const effect of dep) {
        effect.run()
    }
}

// effect包裹的内容被自动调用
let activeEffect;
export function effect(fn){
    const _effect = new ReactiveEffect(fn)
    _effect.run();
}





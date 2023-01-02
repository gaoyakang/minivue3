import { extend } from "../shared";


let activeEffect,shouldTrack;

// 对象的依赖
class ReactiveEffect {
    // fn指的就是reactive()传入的函数
    private _fn: any;
    // activeEffect是依赖对象，deps是依赖对象的一个数组属性，用于存放后续可能会被删除的依赖
    deps = []
    // 为了避免多次调用stop，因为调用一次就已经把依赖删除了，不用多次调用
    active = true;
    // onStop是当stop被调用时触发的回调
    onStop?: () => void;

    constructor(fn, public scheduler?){
        this._fn = fn;
    }

    // 执行reactive()传入的函数
    run(){
        if(!this.active){
            return this._fn()
        }
        shouldTrack = true;
        activeEffect = this;
        const result = this._fn()
        shouldTrack = false;
        return result;
    }

    // 删除对应依赖
    stop(){
        // 为了避免多次调用stop造成性能影响
        if(this.active){
            // 清除依赖
            cleanupEffect(this)
            // 调用回调函数onStop
            if(this.onStop){
                this.onStop();
            }
            this.active = false;
        }
    }
}

// 清除依赖的函数
function cleanupEffect(effect){
    effect.deps.forEach((dep: any) => {
        dep.delete(effect);
    })
    effect.deps.length = 0;
}



// 收集依赖（依赖就是指带fn的那个实例对象）

// 设计数据结构：
// 1.可能会存在多个对象需要追踪，所以必须要一个存放这些对象的容器targetMap
// 2.一个对象可能会存在多个key需要追踪，所以必须要一个存放这些对象的key的依赖的容器depsMap
const targetMap = new Map();
export function track(target, key) {
    // target -> depsMap -> key
    
    if(!isTracking()) return;
    // 1.选择对象
    let depsMap = targetMap.get(target);
    // 初始化时创建depsMap放到targetMap
    if(!depsMap){
        depsMap = new Map();
        targetMap.set(target, depsMap);
    }

    // 2.选择对象的key对应存储的依赖
    let dep = depsMap.get(key)
    // 初始化时创建dep放到depsMap
    if(!dep){
        // dep用来存储依赖
        dep = new Set();
        depsMap.set(key, dep)
    }
    
    // 将依赖加入，实际存储的就是fn
    if(dep.has(activeEffect)) return;
    dep.add(activeEffect)
    
    // activeEffect是依赖对象，deps是依赖对象的一个数组属性，用于存放后续可能会被删除的依赖
    activeEffect.deps.push(dep)
}

function isTracking(){
    // if(!activeEffect) return;
    // if(!shouldTrack) return;
    return shouldTrack && activeEffect != undefined;
}


// 触发依赖
export function trigger(target, key){
    let depsMap = targetMap.get(target);
    let dep = depsMap.get(key);
    for (const effect of dep) {
        if(effect.scheduler){
            effect.scheduler()
        }else{
            effect.run()
        }
    }
}



// effect包裹的内容被自动调用
export function effect(fn,options: any = {}){
    // 新建ReactiveEffect是为了使用面向对象编程
    const _effect = new ReactiveEffect(fn, options.scheduler)
    // 将options内容挂载到_effect上
    extend(_effect,options)
    // 调用reactive()传入的函数
    _effect.run();
    const runner: any = _effect.run.bind(_effect);
    runner.effect = _effect;// stop中使用
    return runner
}


export function stop(runner){
    // 这里的runner指的是effect返回的run方法，即fn
    // 之所以能有effect是因为再effect()返回前将effect实例挂载到了runner上了
    runner.effect.stop();
}
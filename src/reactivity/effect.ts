
// 对象的依赖
class ReactiveEffect {
    // fn指的就是reactive()传入的函数
    private _fn: any;
    constructor(fn, public scheduler?){
        this._fn = fn;
    }

    // 执行reactive()传入的函数
    run(){
        activeEffect = this;
        return this._fn()
    }
}



// 收集依赖（依赖就是指带fn的那个实例对象）

// 设计数据结构：
// 1.可能会存在多个对象需要追踪，所以必须要一个存放这些对象的容器targetMap
// 2.一个对象可能会存在多个key需要追踪，所以必须要一个存放这些对象的key的依赖的容器depsMap
const targetMap = new Map();
export function track(target, key) {
    // target -> depsMap -> key
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
    dep.add(activeEffect)
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
let activeEffect;
export function effect(fn,options: any = {}){
    // 新建ReactiveEffect是为了使用面向对象编程
    const _effect = new ReactiveEffect(fn, options.scheduler)
    // 调用reactive()传入的函数
    _effect.run();

    return _effect.run.bind(_effect);
}





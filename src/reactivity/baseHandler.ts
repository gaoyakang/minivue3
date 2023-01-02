import { track, trigger } from "./effect";

// 全局初始化一次，不需要重复调用
const get =  createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);

// 抽离get函数，并且区分是否位readonly模式
function createGetter(isReadonly = false){
    return function get(target, key){
        // Reflect从target中获取对应key的值
        const res = Reflect.get(target, key)
        // readonly模式不能set也就没有必要去收集依赖
        if(!isReadonly){
            // 依赖收集
            track(target, key)
        }
        // 返回获取到的属性值
        return res;
    }
}

// 抽离set函数
function createSetter(){
    return function set(target, key, value){
        // Reflect在target上获取对应key的值
        const res = Reflect.set(target, key, value);
        // 触发依赖
        trigger(target, key)
        // 返回设置好的属性值
        return res
    }
}

// 抽离了响应式proxy的处理器
export const mutableHandlers = {
    // 当调用对象属性时自动触发
    get,
    // 当设置对象属性时自动触发
    set
}


// 抽离了只读proxy的处理器
export const readonlyHandlers = {
    // 当调用对象属性时自动触发
    get: readonlyGet,

    // 当设置对象属性时自动触发
    set(target, key, value){
        console.warn(`key:${key} set 失败，因为target 是 readonly`, target)
        return true;
    }
}

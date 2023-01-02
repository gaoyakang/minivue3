import { track } from "./effect";
import { trigger } from "./effect";

export function reactive(raw) {
    // 通过proxy劫持原对象，get/set操作对象属性
    return new Proxy(raw,{
        // 当调用对象属性时自动触发
        get(target, key){
            // Reflect从target中获取对应key的值
            const res = Reflect.get(target, key)
            // 依赖收集
            track(target, key)
            // 返回获取到的属性值
            return res;
        },

        // 当设置对象属性时自动触发
        set(target, key, value){
            // Reflect在target上获取对应key的值
            const res = Reflect.set(target, key, value);
            // 触发依赖
            trigger(target, key)
            // 返回设置好的属性值
            return res
        }
    });
}


export function readonly(raw){
    // 通过proxy劫持原对象，get/set操作对象属性
    return new Proxy(raw,{
        // 当调用对象属性时自动触发
        get(target, key){
            // Reflect从target中获取对应key的值
            const res = Reflect.get(target, key)
            // 返回获取到的属性值
            return res;
        },

        // 当设置对象属性时自动触发
        set(target, key, value){
            return true;
        }
    });
}
import { mutableHandlers, readonlyHandlers } from "./baseHandler";


export const enum ReactiveFlags {
    IS_REACTIVE = "__V_isReactive",
    IS_READONLY = "__V_isReadonly",
}

export function reactive(raw) {
    // 通过proxy劫持原对象，get/set操作对象属性
    // 具体逻辑抽离到了baseHandler中
    return createActiveObject(raw,mutableHandlers)
}


export function readonly(raw){
    // 通过proxy劫持原对象，get/set操作对象属性
    // 具体逻辑抽离到了baseHandler中
    return createActiveObject(raw,readonlyHandlers)
}

function createActiveObject(raw: any, baseHandlers){
    // 通过proxy劫持原对象，get/set操作对象属性
    // 具体逻辑抽离到了baseHandler中
    // 这层抽离是为了加强语义化
    return new Proxy(raw,baseHandlers);
}


export function isReactive(value){
    // 原理是调用该target的属性时会自动触发get
    return !!value[ReactiveFlags.IS_REACTIVE]
}

export function isReadonly(value){
    // 原理是调用该target的属性时会自动触发get
    return !!value[ReactiveFlags.IS_READONLY]
}
import { mutableHandlers, readonlyHandlers } from "./baseHandler";



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


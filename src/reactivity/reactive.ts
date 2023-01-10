import { isObject } from "../shared/index";
import {
  mutableHandlers,
  readonlyHandlers,
  shallowReadonlyHandlers,
} from "./baseHandler";
import { track } from "./effect";

export const enum ReactiveFlags {
  IS_REACTIVE = "__V_isReactive",
  IS_READONLY = "__V_isReadonly",
}

export function reactive(raw) {
  // 通过proxy劫持原对象，get/set操作对象属性
  // 具体逻辑抽离到了baseHandler中
  return createActiveObject(raw, mutableHandlers);
}

export function readonly(raw) {
  // 通过proxy劫持原对象，get/set操作对象属性
  // 具体逻辑抽离到了baseHandler中
  return createActiveObject(raw, readonlyHandlers);
}

export function shallowReadonly(raw) {
  // 通过proxy劫持原对象，get/set操作对象属性
  // 具体逻辑抽离到了baseHandler中
  return createActiveObject(raw, shallowReadonlyHandlers);
}

function createActiveObject(raw: any, baseHandlers) {
  if (!isObject(raw)) {
    console.warn(`target ${raw} 必须是一个对象`);
    return raw;
  }
  // 通过proxy劫持原对象，get/set操作对象属性
  // 具体逻辑抽离到了baseHandler中
  // 这层抽离是为了加强语义化
  return new Proxy(raw, baseHandlers);
}

export function isReactive(value) {
  // 原理是调用该target的属性时会自动触发get
  return !!value[ReactiveFlags.IS_REACTIVE];
}

export function isReadonly(value) {
  // 原理是调用该target的属性时会自动触发get
  return !!value[ReactiveFlags.IS_READONLY];
}

export function isProxy(value) {
  return isReactive(value) || isReadonly(value);
}

import { camelize, toHandlerKey } from "../shared/index";

export function emit(instance, event, ...args) {
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

import { camelize, toHandlerKey } from "../shared/index";

export function emit(instance, event, ...args) {
  console.log("emit", event);
  const { props } = instance;

  const handlerName = toHandlerKey(camelize(event));
  // 获取到props传来的onxxx属性
  const handler = props[handlerName];

  handler && handler(...args);
}

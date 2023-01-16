import { createRender } from "../runtime-core";

function createElement(type) {
  return document.createElement(type);
}

function patchProp(el, key, val) {
  const isOn = (key: string) => /^on[A-Z]/.test(key);
  if (isOn(key)) {
    const event = key.slice(2).toLowerCase();
    el.addEventListener(event, val);
  } else {
    el.setAttribute(key, val);
  }
}

function insert(el, parent) {
  parent.append(el);
}

const render: any = createRender({
  createElement,
  patchProp,
  insert,
});

// 包装了渲染器的api
export function createApp(...args) {
  return render.createApp(...args);
}

export * from "../runtime-core/index";

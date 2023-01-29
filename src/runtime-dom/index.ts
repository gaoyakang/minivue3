import { createRender } from "../runtime-core";

function createElement(type) {
  return document.createElement(type);
}

function patchProp(el, key, prevVal, nextVal) {
  const isOn = (key: string) => /^on[A-Z]/.test(key);
  if (isOn(key)) {
    const event = key.slice(2).toLowerCase();
    el.addEventListener(event, nextVal);
  } else {
    if (nextVal === undefined || nextVal === null) {
      el.removeAttribute(key);
    } else {
      el.setAttribute(key, nextVal);
    }
  }
}

function insert(child, parent, anchor) {
  // parent.append(el);
  parent.insertBefore(child, anchor || null);
}

function remove(child) {
  const parent = child.parentNode;
  if (parent) {
    parent.removeChild(child);
  }
}

function setElementText(el, text) {
  el.textContent = text;
}

const render: any = createRender({
  createElement,
  patchProp,
  insert,
  remove,
  setElementText,
});

// 包装了渲染器的api
// ...args是用户传来的参数
export function createApp(...args) {
  // 实际调用了runtime-core的render.ts中的createRender
  // 它返回{ createApp: createAppAPI(render) }
  return render.createApp(...args);
}

export * from "../runtime-core/index";

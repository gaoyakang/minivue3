import { createComponentInstance, setupComponent } from "./component";

export function render(vnode,container){
    patch(vnode,container);
}

function patch(vnode,container){
    // 判断vnode是不是一个element
    // processElement()
    
    //处理component类型
    processComponent(vnode,container)
}

function processComponent(vnode,container){
    mountComponent(vnode, container)
}

function mountComponent(vnode: any,container) {
    // 创建组件实例
    const instance = createComponentInstance(vnode)
    setupComponent(instance)
    setupRenderEffect(instance,container)
}


function setupRenderEffect(instance: any,container) {
    const subTree = instance.render()
    patch(subTree,container)
}


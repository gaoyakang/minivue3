import { render } from "./render";
import { createVNode } from "./vnode"


export function createApp(rootComponent){

    return {
        // 1.component转化vnode
        mount(rootContainer){
            // 创建虚拟节点
            const vnode = createVNode(rootComponent)
            // 
            render(vnode,rootContainer);
        }
    }
}

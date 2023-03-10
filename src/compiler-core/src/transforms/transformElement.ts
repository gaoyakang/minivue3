import { NodeTypes } from "../ast";
import { CREATE_ELEMENT_VNODE } from "../runtimeHelpers";

export function transformElement(node, context) {
  if (node.type === NodeTypes.ELEMENT) {
    return () => {
      context.helper(CREATE_ELEMENT_VNODE);

      //中间处理层
      const vnodeTag = node.tag;

      let vnodeProps;

      const children = node.children;

      let vnodeChildren = children[0];

      const vnodeElement = {
        type: NodeTypes.ELEMENT,
        tag: vnodeTag,
        props: vnodeProps,
        children: vnodeChildren,
      };

      node.codegenNode = vnodeElement;
    };
  }
}

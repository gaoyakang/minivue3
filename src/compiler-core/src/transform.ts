import { NodeTypes } from "./ast";

export function transform(root, options) {
  // 0.创建上下文环境
  const context = createTransformContext(root, options);
  //1.遍历：深度优先搜索
  traverseNode(root, context);
  //2.修改text conten
}

function traverseNode(node: any, context) {
  // 查看是否有配置项plugin
  const nodeTransforms = context.nodeTransforms;
  for (let i = 0; i < nodeTransforms.length; i++) {
    const transform = nodeTransforms[i];
    transform(node);
  }
  // 遍历子节点
  traverseChildren(node, context);
}

// 创建transform的上下文环境
function createTransformContext(root: any, options: any) {
  const context = {
    root,
    nodeTransforms: options.nodeTransforms || [],
  };
  return context;
}

function traverseChildren(node: any, context: any) {
  // 深度优先不断遍历
  const children = node.children;
  if (children) {
    for (let i = 0; i < children.length; i++) {
      const node = children[i];
      traverseNode(node, context);
    }
  }
}

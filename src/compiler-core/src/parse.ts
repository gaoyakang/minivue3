import { NodeTypes } from "./ast";

export function baseParse(content: string) {
  // 全局的上下文对象
  const context = createParseContext(content);

  // 创建根节点
  return createRoot(parseChildren(context));
}

// 解析插值
function parseInterplation(context) {
  const openDelimiter = "{{";
  const closeDelimiter = "}}";

  // {{message}}
  // closeIndex:}}右花括号下标
  const closeIndex = context.source.indexOf(
    closeDelimiter,
    closeDelimiter.length
  );
  // 将{{去掉
  advanceBy(context, openDelimiter.length);

  // 获取花括号内的内容
  const rawContentLength = closeIndex - openDelimiter.length;
  let rowContent = context.source.slice(0, rawContentLength);
  // 去除左右空格
  const content = rowContent.trim();

  // 删除花括号内的内容
  advanceBy(context, rawContentLength + closeDelimiter.length);

  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content: content,
    },
  };
}

// 删除解析过的内容，向后推进
function advanceBy(context: any, length: number) {
  context.source = context.source.slice(length);
}

// 解析子配置
function parseChildren(context) {
  const nodes: any = [];
  let node;
  // 解析插值
  if (context.source.startsWith("{{")) {
    node = parseInterplation(context);
  }

  nodes.push(node);
  return nodes;
}

// 创建根节点
function createRoot(children) {
  return {
    children,
  };
}

// 创建全局上下文
function createParseContext(content: string): any {
  return {
    source: content,
  };
}

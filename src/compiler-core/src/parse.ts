import { NodeTypes } from "./ast";

export function baseParse(content: string) {
  // 全局的上下文对象
  const context = createParseContext(content);

  // 创建根节点
  return createRoot(parseChildren(context, []));
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
  let rowContent = parseTextData(context, rawContentLength);
  // 去除左右空格
  const content = rowContent.trim();

  // 删除花括号内的内容
  advanceBy(context, closeDelimiter.length);

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
function parseChildren(context, ancestors) {
  const nodes: any = [];
  while (!isEnd(context, ancestors)) {
    let node;
    const s = context.source;
    // 解析插值
    if (s.startsWith("{{")) {
      node = parseInterplation(context);
    } else if (s[0] === "<") {
      // 解析element
      if (/[a-z]/i.test(s[1])) {
        node = parseElement(context, ancestors);
      }
    }

    // 解析text
    if (!node) {
      node = parseText(context);
    }

    nodes.push(node);
  }
  return nodes;
}

// 判断模板是否解析完了
function isEnd(context: any, ancestors) {
  // 遇到结束标签
  const s = context.source;
  if (s.startsWith("</")) {
    // 倒着循环栈结构速度更快
    for (let i = ancestors.length - 1; i >= 0; i--) {
      const tag = ancestors[i].tag;
      // 判断是否是一个闭合标签
      if (startsWithEndTagOpen(s, tag)) {
        return true;
      }
      if (s.slice(2, 2 + tag.length) === tag) {
        return true;
      }
    }
  }
  // source有值的时候
  return !s;
}

// 解析text
function parseText(context: any) {
  // 获取到text内容最后一位下标
  let endIndex = context.source.length;
  let endTokens = ["<", "{{"];
  for (let i = 0; i < endTokens.length; i++) {
    const index = context.source.indexOf(endTokens[i]);
    if (index != -1 && endIndex > index) {
      endIndex = index;
    }
  }

  // 获取content内容
  const content = parseTextData(context, endIndex);

  return {
    type: NodeTypes.TEXT,
    content,
  };
}
function parseTextData(context: any, length: number) {
  // 1.获取当前content
  const content = context.source.slice(0, length);
  // 2.推进
  advanceBy(context, length);
  return content;
}

// 解析element
const enum TagTypes {
  Start,
  End,
}
function parseElement(context: any, ancestors) {
  // 解析左半边tag
  const element: any = parseTag(context, TagTypes.Start);

  // 收集对称的标签用于后期验证标签是否未闭合
  ancestors.push(element);

  // 循环解析标签内的内容
  element.children = parseChildren(context, ancestors);

  // 解析完成后销毁标签
  ancestors.pop();

  // 解析右半边tag
  if (startsWithEndTagOpen(context.source, element.tag)) {
    // 开始标签和结束标签一一对应时，解析对应内容
    parseTag(context, TagTypes.End);
  } else {
    // 开始标签和结束标签不对应时，抛出错误
    throw new Error(`缺少闭合标签:${element.tag}`);
  }

  return element;
}
// 获取闭合标签
function startsWithEndTagOpen(source, tag) {
  return (
    source.startsWith("</") &&
    source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase()
  );
}

// 解析tag
function parseTag(context: any, type: TagTypes) {
  // 1.解析tag

  const match: any = /^<\/?([a-z]*)/i.exec(context.source);
  // console.log(match);
  const tag = match[1];

  // 2.删除解析完成的内容
  advanceBy(context, match[0].length); //删掉解析过的tag
  advanceBy(context, 1); //删掉>

  // 遇到tag结束标签直接结束
  if (type === TagTypes.End) return;

  return {
    type: NodeTypes.ELEMENT,
    tag,
  };
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

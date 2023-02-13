import { NodeTypes } from "../src/ast";
import { baseParse } from "../src/parse";
import { transform } from "../src/transform";

describe("transform", () => {
  it.only("happy path", () => {
    // 0.生成ast语法树
    const ast = baseParse("<div>hi,{{message}}</div>");

    // 1.transform的配置插件
    const plugin = (node) => {
      // 修改节点内容
      if (node.type === NodeTypes.TEXT) {
        node.content = node.content + "mini-vue";
      }
    };

    // 2.执行transform
    transform(ast, {
      nodeTransforms: [plugin],
    });

    // 3.取出对应的内容
    const nodeText = ast.children[0].children[0];

    // 4.验证
    expect(nodeText.content).toBe("hi,mini-vue");
  });
});

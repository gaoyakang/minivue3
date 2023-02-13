import { NodeTypes } from "../src/ast";
import { baseParse } from "../src/parse";

describe("Parse", () => {
  // 插值
  describe("interplation", () => {
    test("simple interplation", () => {
      const ast = baseParse("{{ message}}");
      expect(ast.children[0]).toStrictEqual({
        type: NodeTypes.INTERPOLATION,
        content: {
          type: NodeTypes.SIMPLE_EXPRESSION,
          content: "message",
        },
      });
    });
  });
});

describe("Parse", () => {
  // 解析element
  describe("element", () => {
    it("simple element div", () => {
      const ast = baseParse("<div></div>");
      console.log(Date());
      expect(ast.children[0]).toStrictEqual({
        type: NodeTypes.ELEMENT,
        tag: "div",
      });
    });
  });
});

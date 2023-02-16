import { generate } from "../src/codegen";
import { baseParse } from "../src/parse";
import { transform } from "../src/transform";
import { transformExpression } from "../src/transforms/transformExpression";

describe("codegen", () => {
  // 生成字符串
  it("string", () => {
    // 1.生成ast树
    const ast = baseParse("hi");

    // 2.修改ast树，为其添加在不同步骤中需要的参数
    transform(ast);

    // 3.生成可执行代码
    const { code } = generate(ast);

    // 4.快照验证
    expect(code).toMatchSnapshot();
  });

  // 生成插值
  it("interpolation", () => {
    // 1.生成ast树
    const ast = baseParse("{{message}}");

    // 2.修改ast树，为其添加在不同步骤中需要的参数
    transform(ast, {
      nodeTransforms: [transformExpression],
    });

    // 3.生成可执行代码
    const { code } = generate(ast);

    // 4.快照验证
    expect(code).toMatchSnapshot();
  });
});

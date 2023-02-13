import { generate } from "../src/codegen";
import { baseParse } from "../src/parse";
import { transform } from "../src/transform";

describe("codegen", () => {
  it("string", () => {
    // 1.生成ast树
    const ast = baseParse("hi");

    // 2.修改ast树
    transform(ast);

    // 3.生成可执行代码
    const { code } = generate(ast);

    // 4.快照验证
    expect(code).toMatchSnapshot();
  });
});

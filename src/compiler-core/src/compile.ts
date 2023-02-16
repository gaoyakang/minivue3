import { generate } from "./codegen";
import { baseParse } from "./parse";
import { transform } from "./transform";
import { transformElement } from "./transforms/transformElement";
import { transformExpression } from "./transforms/transformExpression";
import { transformText } from "./transforms/transformText";

export function baseCompile(template) {
  // 1.生成ast树
  const ast: any = baseParse(template);

  // 2.修改ast树，为其添加在codegen中需要的参数
  transform(ast, {
    nodeTransforms: [transformExpression, transformElement, transformText],
  });
  // 3.生成可执行代码
  return generate(ast);
}

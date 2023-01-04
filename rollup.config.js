import typescript from "@rollup/plugin-typescript"

export default {
    input:"./src/index.ts",
    output:[
        // cjs类型
        {
            format: "cjs",
            file:"lib/guide-mini-vue.cjs.js"
        },
        // esm类型
        {
            format: "es",
            file:"lib/guide-mini-vue.esm.js"
        }
    ],
    plugins:[
        typescript()
    ]
}
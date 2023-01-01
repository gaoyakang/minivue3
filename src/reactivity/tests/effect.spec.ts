import { effect } from "../effect";
import { reactive } from "../reactive";

describe('effect', () => {
    it('happy path', () => {
        const user = reactive({
            age: 10
        })

        // 调用响应式对象的属性时触发get方法
        let nextAge;
        effect(() => {
            nextAge = user.age + 1;
        })

        expect(nextAge).toBe(11)

        // 修改响应式对象的属性值时触发set方法
        user.age++;
        expect(nextAge).toBe(12)
    });
})

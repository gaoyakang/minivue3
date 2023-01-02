import { reactive, isReactive } from "../reactive";

describe('reactive',() => {
    it('happy path', () => {
        const original = { foo: 1 };
        const observed = reactive(original)
        // original是个object对象
        // observed是被劫持后的对象
        expect(observed).not.toBe(original)
        // 调用对象的属性时自动触发get
        expect(observed.foo).toBe(1)
        expect(isReactive(observed)).toBe(true)
        expect(isReactive(original)).toBe(false)
    });
})

import { reactive } from "../reactive"
import { computed } from "../computed"

describe("computed", () => {
    it("happy path", () => {
        const user = reactive({
            age:1
        })
        const age = computed(() => {
            return user.age;
        })
        expect(age.value).toBe(1)
    })

    it("should compute lazily", () => {
        const value = reactive({ foo: 1 });
        const getter = jest.fn(() => {
            return value.foo
        })
        const cValue = computed(getter)
        // 懒执行，必须手动cValue.value才会执行
        expect(getter).not.toHaveBeenCalled()
        expect(cValue.value).toBe(1)
        expect(getter).toHaveBeenCalledTimes(1);

        // 只会调用一次：
        // 上面cValue.value调用了一次，下面cValue.value又调用一次
        // 此时本应该getter被调用了2次
        // 但经过computed(getter)后，因为2次结果并没有改变，应该直接使用上次调用产生的结果而不是再去调用一次getter
        // 所以这里getter调用次数应该是1次
        cValue.value;
        expect(getter).toHaveBeenCalledTimes(1);
        
        // 响应式对象属性值发生改变
        // 这里并没有手动调用cValue.value，所以getter还是只调用了1次
        value.foo = 2;
        expect(getter).toHaveBeenCalledTimes(1)

        // 由于value.foo的值发生了改变，所以cValue.value的值也发生了改变
        // computed内部维护的ReactiveEffect采用scheduler模式
        // 首次调用getter，当响应式数据改变时会调用scheduler函数而不是getter
        expect(cValue.value).toBe(2)
        expect(getter).toHaveBeenCalledTimes(2)

        // 2次结果并没有改变，应该直接使用上次调用产生的结果而不是再去调用一次getter，所以getter被调用了2次
        cValue.value;
        expect(getter).toHaveBeenCalledTimes(2)

    })
})
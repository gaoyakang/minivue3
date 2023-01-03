import { ReactiveEffect } from "./effect";

class ComputedRefImpl{
    private _getter : any;
    private _dirty : boolean = true;
    private _value : any;
    private _effect : any;
    constructor(getter){
        this._getter = getter;
        // 首次调用fn，当响应式数据改变时会调用scheduler函数而不是fn
        this._effect = new ReactiveEffect(getter, () => {
            if(!this._dirty){
                this._dirty = true;
            }
        })
    }

    get value(){
        // 如果getter执行过一次就将其锁上不再执行
        if(this._dirty){
            this._dirty = false;
            // this._value = this._getter()
            this._value = this._effect.run();
        }
        return this._value;
    }
}

export function computed(getter){
    return new ComputedRefImpl(getter)
}
import { hasChanged, isObject } from "../shared";
import { isTracking, trackEffects, triggerEffects } from "./effect";
import { reactive } from "./reactive";

class RefImpl{
    // ref最初传过来的值
    private _value: any;
    // ref包裹内容的依赖存储数组
    public dep;
    // ref最初传过来的值
    private _rawValue;
    // 判断是否为ref
    public __v_isRef = true;
    constructor(value){
        this._rawValue = value;
        // 判断是value是普通型还是引用型
        this._value= convert(value)
        // 依赖实际存放的地方
        this.dep = new Set();
    }

    get value(){
        // 依赖收集
        trackRefValue(this);
        return this._value;
    }

    set value(newValue){
        // 判断传入的值和以前的值是否一样，如果改变了就去触发依赖
        if(hasChanged(newValue,this._rawValue)){
            this._rawValue = newValue;
            // 判断是普通型还是是引用型
            this._value= convert(newValue)
            // 触发依赖
            triggerEffects(this.dep)
        }
    }
}

function convert(value){
    // 如果value是普通型直接返回该值
    // 如果value是引用型经reactive包裹后返回
    console.log(isObject(value))
    return isObject(value) ? reactive(value) : value;
}

function trackRefValue(ref){
    // 判断需不需要追踪
    if(isTracking()){
        // 收集依赖
        // ref指的是RefImpl的实例，dep是依赖存放的地方
        trackEffects(ref.dep);
    }
}

export function ref(value){
    return new RefImpl(value)
}

export function isRef(ref){
    return !!ref.__v_isRef;
}

export function unRef(ref){
    return isRef(ref) ? ref.value : ref;
}
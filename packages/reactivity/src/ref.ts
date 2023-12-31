import { isObject } from '@vue/shared'
import { activeEffect, trackEffects, triggerEffects } from './effect'
import { reactive } from './reactive'

function toReactive(value) {
	return isObject(value) ? reactive(value) : value
}
export function isRef(value) {
	return value && value.__v_isRef
}
class RefImpl {
	dep
	_value
	__v_isRef = true
	constructor(public rawValue) {
		this._value = toReactive(rawValue) // 对传进来的原始值进行代理
	}
	get value() {
		if (activeEffect) {
			// 依赖收集
			trackEffects(this.dep || (this.dep = new Set()))
		}
		return this._value
	}
	set value(newValue) {
		if (newValue !== this.rawValue) {
			// 更新值
			this._value = toReactive(newValue)
			this.rawValue = newValue
			// 触发更新
			triggerEffects(this.dep)
		}
	}
}

/**
 * ref API 本质就是将传入的值进行一层封装，成为对象。原来传入的值根据类型进行处理，存入对象的 _value 属性。
 * @param value
 * @returns
 */
export function ref(value) {
	return new RefImpl(value)
}

class ObjectRefImpl {
	dep
	__v_isRef = true
	constructor(public _target, public _key) {}
	_value
	get value() {
		// 收集依赖
		if (activeEffect) {
			trackEffects(this.dep || (this.dep = new Set()))
		}
		// 取值
		this._value = this._target[this._key]
		return this._value
	}
	set value(newValue) {
		if (newValue !== this._value) {
			// 更新值
			this._target[this._key] = newValue
			this._value = this._target[this._key]
			// 触发更新
			triggerEffects(this.dep)
		}
	}
}

/**
 *
 * @param target  reactive 响应式对象
 * @param key 属性名
 * @returns
 */
export function toRef(target, key) {
	return new ObjectRefImpl(target, key)
}

/**
 *
 * @param target reactive 响应式对象
 * @returns
 */
export function toRefs(target) {
	const res = {}
	for (let key in target) {
		res[key] = toRef(target, key)
	}
	return res
}

export function proxyRefs(objectWithRefs) {
	return new Proxy(objectWithRefs, {
		get(target, key, receiver) {
			const v = Reflect.get(target, key, receiver) // 获取对象属性的值 即 ObjectRefImpl实例
			return v.__v_isRef ? v.value : v
		},
		set(target, key, value, receiver) {
			const oldValue = target[key]
			if (!oldValue.__v_isRef) {
				return Reflect.set(target, key, value, receiver)
			}
			oldValue.value = value
			return true
		},
	})
}

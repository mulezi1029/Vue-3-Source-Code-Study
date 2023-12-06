import { isObject } from '@vue/shared'
import { trackEffects, triggerEffects } from './effect'
import { reactive } from './reactive'

function toReactive(value) {
	return isObject(value) ? reactive(value) : value
}

class RefImpl {
	dep
	_value
	__v_isRef = true
	constructor(public rawValue) {
		this._value = toReactive(rawValue) // 对传进来的原始值进行代理
	}
	get value() {
		// 依赖收集
		trackEffects(this.dep || (this.dep = new Set()))
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

import { isObject } from '@vue/shared'
import { track, trigger } from './effect'
import { reactive, ReactiveFlags } from './reactive'
import { isRef } from './ref'

export const baseHandlers = {
	get(target, key, receiver) {
		if (key === ReactiveFlags.IS_REACTIVE) {
			return true
		}
		// console.log(activeEffect, key) // 能够知道 属性 与 副作用函数的对应关系：哪个函数中读取到了哪个属性

		track(target, key)
		let res = Reflect.get(target, key, receiver)

		// 如果访问的属性其值是 ref 时，自动拆包
		if (isRef(res)) {
			return res.value
		}

		// 如果访问的属性其值还是对象，那么就进行深度代理
		if (isObject(res)) {
			return reactive(res)
		}

		return res
	},

	set(target, key, value, receiver) {
		let oldValue = target[key]
		let res = Reflect.set(target, key, value, receiver)
		if (oldValue !== value) {
			// 触发更新
			trigger(target, key, value, oldValue)
		}
		return res
	},
}

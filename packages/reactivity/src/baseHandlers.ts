import { track, trigger } from './effect'
import { ReactiveFlags } from './reactive'

export const baseHandlers = {
	get(target, key, receiver) {
		if (key === ReactiveFlags.IS_REACTIVE) {
			return true
		}
		// console.log(activeEffect, key) // 能够知道 属性 与 副作用函数的对应关系：哪个函数中读取到了哪个属性
		track(target, key)
		return Reflect.get(target, key, receiver)
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

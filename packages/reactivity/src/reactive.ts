import { isObject } from '@vue/shared'
import { baseHandlers } from './baseHandlers'

export const enum ReactiveFlags {
	IS_REACTIVE = '__v_isReactive',
}

export function isReactive(value: any): boolean {
	return !!(value && value[ReactiveFlags.IS_REACTIVE])
}

// 缓存一个对象的proxy代理
const proxyMap = new WeakMap()

export function reactive(target) {
	// 不是对象，直接返回
	if (!isObject(target)) {
		return target
	}

	// 如果传入的对象就是一个 reactive 对象，直接返回传入的该对象
	// 逻辑是：如果是一个 reactive 对象，那么访问属性就会进入 get 拦截器
	if (target[ReactiveFlags.IS_REACTIVE]) {
		return target
	}

	// 如果该对象先前已经被代理过，直接返回缓存的值
	const existingProxy = proxyMap.get(target)
	if (existingProxy) {
		return existingProxy
	}

	const proxy = new Proxy(target, baseHandlers)

	// 进行缓存
	proxyMap.set(target, proxy)

	return proxy
}

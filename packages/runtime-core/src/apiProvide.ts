import { hasOwn } from '@vue/shared'
import { currentInstance } from './component'

// provide 与 inject 只能在 setup 中使用
export function provide(key, value) {
	debugger
	if (currentInstance) {
		// 每个组件实例都有自己的 provides，且其初始值来源于父级的 provides
		let provides = currentInstance.provides // 获取当前实例的 provides
		const parentProvides = currentInstance.parent && currentInstance.parent.provides // 获取父级的 provides
		// 判断是否是第一次调用：通过看当前实例 provides 是否与父级 provides 相等得出当前实例是否是第一次调用 provide 函数，相等的话，就是第一次调用，要将当前实例的 provides 与 父级 provides 进行独立
		if (provides === parentProvides) {
			// 重新赋值组件的 provides，每个组件的 provides 都是各自独立的
			provides = currentInstance.provides = Object.create(provides)
		}
		provides[key] = value
	}
}

export function inject(key, defaultValue) {
	if (currentInstance) {
		const provides = currentInstance.parent?.provides // 从当前实例上取得的 provides
		if (provides && key in provides) {
			// 顺着原型链查找，如果有就返回，如果没有就返回默认值
			return provides[key]
		} else if (defaultValue) {
			return defaultValue
		}
	}
}

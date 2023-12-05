import { isReactive } from './reactive'
import { ReactieEffect } from './effect'
import { isFunction, isObject } from '@vue/shared'

function traverse(source, visited = new Set()) {
	if (!isObject(source)) {
		return source
	}
	// 遍历对象可能会有循环引用的问题
	// 考虑循环引用，采用 set
	if (visited.has(source)) {
		return source
	}
	visited.add(source)
	for (let key in source) {
		traverse(source[key], visited) // 递归取属性值
	}
	return source
}

export function watch(source, cb, options: any = {}) {
	let oldValue
	let getter
	// 如果数据源是响应式对象
	if (isReactive(source)) {
		// 处理为 getter 函数
		getter = () => traverse(source) // 调用 effect.run 时，执行此函数，返回的是对象，只有访问属性才能收集依赖
	} else if (isFunction(source)) {
		getter = source
	}
	// 依赖变化后触发的调度函数
	const job = () => {
		// 内部要调用cb，即watch的回调方法
		const newVal = effect.run()
		cb(newVal, oldValue)
		oldValue = newVal
	}
	const effect = new ReactieEffect(getter, job) // getter 中的依赖变化后会执行 job
	if (options.immediate) {
		job()
	}
	oldValue = effect.run() // 保留旧的值
}

import { isReactive } from './reactive'
import { ReactieEffect } from './effect'
import { isFunction, isObject } from '@vue/shared'

// 遍历响应式对象的所有属性，收集依赖
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

function doWatch(source, cb, opts) {
	let oldValue
	let getter
	// 如果数据源是响应式对象
	if (isReactive(source)) {
		// 处理为 getter 函数
		getter = () => traverse(source) // 调用 effect.run 时，执行此函数，返回的是对象，只有访问属性才能收集依赖
	} else if (isFunction(source)) {
		// watch 传入的是 getter 函数 或者是 watchEffect 传入的函数
		getter = source
	}
	// 依赖变化后触发的调度函数
	const job = () => {
		// 传入了 cb 说明调用的是 watch
		if (cb) {
			// 内部要调用cb，即watch的回调方法
			const newVal = effect.run()
			cb(newVal, oldValue)
			oldValue = newVal
		} else {
			// 否则就是 watchEffect，触发重新执行 effect
			effect.run()
		}
	}
	const effect = new ReactieEffect(getter, job) // getter 中的依赖变化后会执行 job
	if (opts.immediate) {
		job()
	}
	oldValue = effect.run() // 保留旧的值
}

export function watch(source, cb, options: any = {}) {
	doWatch(source, cb, options)
}

// watchEffect  理解为就是之前实现的 effect，其实是一样的，只是作为框架，vue 向用户暴露的 watchEffect 这个 API，effect API 是框架底层实现依赖使用的 API。
// export function watchEffect(effect, options: any = {}) {
// 	// doWatch(effect, null, options)
// 	const _effect = new ReactieEffect(effect, options.scheduler)
// 	_effect.run()
// }

export function watchEffect(effect, options: any = {}) {
	doWatch(effect, null, options)
}

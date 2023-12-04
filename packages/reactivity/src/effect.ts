export let activeEffect

export class ReactieEffect {
	// 控制这个函数是否需要响应性的开关标志
	public active = true

	public parent = null
	constructor(public fn, private scheduler) {}
	public deps = [] // 记录该响应性函数依赖的响应性属性的集合

	// 执行副作用函数，并在副作用函数执行过程中收集依赖
	run() {
		// 如果不需要开启响应性。直接执行
		if (!this.active) {
			return this.fn()
		}
		// 需要开启响应性
		try {
			this.parent = activeEffect
			activeEffect = this
			// 清理依赖:每次收集依赖前，将当前 effect 从该对象所有属性的 effect 的集合中删除
			cleanupEffect(this)
			return this.fn() // 执行函数时，会读取响应式的属性，进入 get 拦截器，从而可以收集对应的依赖关系
		} finally {
			// 无论如何都会执行
			activeEffect = this.parent
			this.parent = null
		}
	}

	// 关闭副作用函数的响应性，使得内部依赖变化也不会触发执行
	stop() {
		console.log('关闭响应性')
		// 将响应式标志关闭
		if (this.active) {
			cleanupEffect(this) // 先将当前effect所有依赖清除
			this.active = false // 再将其变为失活态（非响应性）
		}
	}
}

/**
 * 依赖收集  将当前的 effect 变为全局的  便于在读取到对应属性时 取到这个全局的 effect
 * @param fn 响应式的函数
 */
export function effect(fn, options: any = {}) {
	const _effect = new ReactieEffect(fn, options.scheduler)
	_effect.run() // 默认执行一次
	const runner = _effect.run.bind(_effect) // 保证 this 指向当前effect
	runner.effect = _effect // 将当前 effect 暴露给 runner 供外界使用
	return runner
}

// effect(() => {
// 	state.name // name 属性应该收集到 最外层的 effect
// 	effect(() => {
// 		state.age // age 属性应该收集到 内层的 effect
// 	})
// 	state.hby // hby 属性应该收集到 最外层的 effect
// })

// 每次调用 effect 函数时，都会创建一个 ReactiveEffect 实例，具有 parent 属性
// 并且调用 run 方法：run 方法内部给 parent 属性赋值，并将全局的 activeEffect 设为该实例对象，表明当前活跃的 effect 为当前 effect 实例

// 需要一个映射表：记录所有对象的相关的所有属性与响应式函数的依赖关系
// let mapping = {
// 	target1: {
// 		key1: [activeEffect1, activeEffect2, activeEffect3],
// 		key2: [activeEffect1, activeEffect4],
// 	},
// 	target2: {
// 		key1: [activeEffect1],
// 	},
// }

const targetMap = new WeakMap() // 一个映射表：键是不同对象，值是一个Map。用于记录 每个对象其所有 属性与函数的 映射

/**
 * 清理依赖
 * @param effect
 */
function cleanupEffect(effect) {
	const { deps } = effect
	for (const dep of deps) {
		dep.delete(effect)
	}
	effect.deps.length = 0 // 清理对应的数组
}

/**
 * 收集依赖
 * @param target
 * @param key
 */
export function track(target, key) {
	// 如果访问属性的操作没有发生在 effect 中，直接返回，不会追中到依赖
	// 或者 effect 是失活态，也不会收集依赖。
	// 可以将是否有 activeEffect 视为一种是否收集依赖的标准
	if (!activeEffect) {
		return
	}
	let depsMap = targetMap.get(target)
	if (!depsMap) {
		targetMap.set(target, (depsMap = new Map()))
	}
	let dep = depsMap.get(key)
	if (!dep) {
		depsMap.set(key, (dep = new Set()))
	}

	let shouldTrack = !dep.has(activeEffect)
	if (shouldTrack) {
		dep.add(activeEffect)
		activeEffect.deps.push(dep) // 后续需要通过 effect 来清理的时候使用
		// 一个属性对应多个 effect；一个 effect 对应多个属性
	}
}

/**
 * 触发更新
 * @param target
 * @param key
 * @param value
 * @param oldValue
 * @returns
 */
export function trigger(target, key, value, oldValue) {
	const depsMap = targetMap.get(target)
	if (!depsMap) {
		return
	}
	const dep = depsMap.get(key) // 拿到 属性 对应的 effect 集合，循环执行
	// 这里逻辑还有问题：问题是 set 与数组都有的使用上的陷阱
	if (dep) {
		const effects = [...dep]
		effects.forEach((effect) => {
			if (activeEffect !== effect) {
				// 为避免effect 中修改同一个effect当前依赖的属性造成递归死循环，进行判断：当前执行的 effect 与 遍历到的准备的执行的effect 不相等时，才调用执行操作
				if (!effect.scheduler) {
					effect.run()
				} else {
					effect.scheduler()
				}
				// 解决思路，每次执行的时候先清理，再重新收集依赖。
			}
		})
	}
}

// // 类比于
// let arr = [1]
// arr.forEach((item) => {
// 	arr.pop()
// 	arr.push(1)
// }) // 造成死循环

import { isFunction } from '@vue/shared'
import { activeEffect, ReactieEffect, trackEffects, triggerEffects } from './effect'

const noop = () => {}

class ComputedRefImp {
	dep = null // 计算属性收集的effects依赖集合
	effect = null // getter 的封装
	__v_isRef = true
	_dirty = true // 控制是否需要重新执行：第一次取后，只要依赖没变后面都直接取缓存，不需要重新执行；依赖变后才要重新执行。 初始为true 表示需要执行
	_value = undefined // 缓存值
	constructor(getter, public setter) {
		// 源码不能使用 effect(()=>{},{scheduler(){}})，因为这样传入的getter会立即执行，而我们需要的是只有在取值是才执行
		this.effect = new ReactieEffect(getter, () => {
			this._dirty = true
			// 触发使用计算属性的副作用函数
			triggerEffects(this.dep)
		})
	}
	get value() {
		// 如果有 activeEffect 表明该计算属性在一个 effect 中使用
		// 那么就应该将该计算属性与 effect 互相收集
		if (activeEffect) {
			trackEffects(this.dep || (this.dep = new Set()))
		}
		// 发生取值操作时，才会去执行，并把取到的值缓存起来
		if (this._dirty) {
			this._value = this.effect.run()
			this._dirty = false
		}
		return this._value
	}
	set value(newValue) {
		this.setter(newValue)
	}
}

export function computed(getterOrOptions) {
	const onlyGetter = isFunction(getterOrOptions)

	let getter
	let setter

	if (onlyGetter) {
		getter = getterOrOptions
		setter = noop
	} else {
		getter = getterOrOptions.get
		setter = getterOrOptions.set || noop
	}

	return new ComputedRefImp(getter, setter)
}

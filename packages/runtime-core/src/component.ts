import { reactive } from '@vue/reactivity'
import { hasOwn, isFunction } from '@vue/shared'
import { initProps } from './componentProps'

export function createComponentInstane(vnode) {
	const instance = {
		//  组件实例
		data: null,
		isMounted: false,
		vnode,
		subTree: null, // 一个组件实际渲染的是其封装的 UI 结构， subTree 就是对应封装的 UI 结构的虚拟节点
		update: null, // 执行组件更新的函数
		props: {}, // 组件声明使用的 props 属性
		attrs: {}, // 组件未声明的属性
		propsOptions: vnode.type.props || {}, // 组件声明的 props 选项，根据这个和所有的props，设置 props和attrs
		proxy: null, // 组件实例的代理， this 指向整合，可以访问到 data 也可以 props

		// 组件生命周期
		// 组件插槽
		// 组件事件
	}
	return instance
}
const publicProperties = {
	$attrs: (target) => target.attrs,
	$props: (target) => target.props,
}
const PublicInstanceProxyHandlers = {
	// 对组件实例代理，实现 this.xxxKey 访问到 data 和 props
	get(target, key) {
		let { props, data } = target
		if (data && hasOwn(key, data)) {
			return data[key]
		} else if (hasOwn(key, props)) {
			return props[key]
		}
		// this.$attrs  this.$props
		let getter = publicProperties[key]
		if (getter) {
			return getter(target)
		}
		return Reflect.get(target, key)
	},
	set(target, key, value) {
		let { props, data } = target
		if (hasOwn(key, data)) {
			data[key] = value
		} else if (hasOwn(key, props)) {
			props[key] = value
		}
		return true
	},
}

export function setupComponent(instance) {
	const { type, props } = instance.vnode
	// 将传进来的所有的 props 根据情况解析为组件的 props 与 attrs，放到组件实例上
	initProps(instance, props)
	// 代理组件实例，处理 this 指向，实现 this.xxxKey 访问到 data 和 props 中对应的属性
	instance.proxy = new Proxy(instance, PublicInstanceProxyHandlers)

	// 处理 data
	let data = type.data
	if (data) {
		// vue2 传递的data
		if (isFunction(data)) {
			instance.data = reactive(data.call(instance.proxy))
		}
	}

	instance.render = type.render //  组件的 render 函数设置到实例上
}

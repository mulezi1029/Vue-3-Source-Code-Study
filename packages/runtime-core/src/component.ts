import { proxyRefs, reactive } from '@vue/reactivity'
import { hasOwn, isFunction } from '@vue/shared'
import { shapeFlags } from 'packages/shared/src/shapeFlags'
import { initProps } from './componentProps'

export function createComponentInstane(vnode, parent) {
	//  组件实例
	const instance = {
		data: null,
		isMounted: false,
		vnode,
		subTree: null, // 组件实际渲染的是其封装的 UI 结构， subTree 就是对应封装的 UI 结构的虚拟节点
		update: null, // 组件更新的函数
		props: {}, // 组件声明使用的 props 属性
		attrs: {}, // 组件未声明的属性
		propsOptions: vnode.type.props || {}, // 组件声明的 props 选项，根据这个和所有的 props，设置 props和attrs
		proxy: null, // 组件实例的代理， this 指向整合，可以访问到 data 也可以 props
		// 组件生命周期
		bm: null,
		m: null,
		bu: null,
		u: null,
		bum: null,
		um: null,
		slots: null, // 组件插槽
		steupState: null,
		exposed: null, // ref 模板引用时，获取组件实例暴露处的内容
		parent: parent, // 记录父组件实例
		provides: parent ? parent.provides : Object.create(null), // 记录父组件提供的内容
	}
	return instance
}

const publicProperties = {
	$attrs: (target) => target.attrs,
	$props: (target) => target.props,
	$slots: (target) => target.slots,
}

const PublicInstanceProxyHandlers = {
	// 对组件实例代理，实现 this.xxxKey 访问到 data 和 props
	get(target, key) {
		let { props, data, setupState } = target
		if (data && hasOwn(key, data)) {
			return data[key]
		} else if (hasOwn(key, props)) {
			return props[key]
		} else if (setupState && hasOwn(key, setupState)) {
			return setupState[key]
		}
		// this.$attrs  this.$props
		let getter = publicProperties[key]
		if (getter) {
			return getter(target)
		}
	},
	set(target, key, value) {
		let { props, data, setupState } = target
		if (data && hasOwn(key, data)) {
			data[key] = value
		} else if (hasOwn(key, props)) {
			props[key] = value
		} else if (setupState && hasOwn(key, setupState)) {
			setupState[key] = value
		}
		return true
	},
}

function initSlots(instance, children) {
	if (children) {
		if (instance.vnode.shapeFlag & shapeFlags.SLOTS_CHILDREN) {
			instance.slots = children // 插槽绑定到实例上
		}
	}
}

export let currentInstance // 当前正在执行组件实例

export function setCurrentInstance(instance) {
	currentInstance = instance
}

export function getCurrentInstance(instance) {
	return currentInstance
}

export function setupComponent(instance) {
	const { type, props, children } = instance.vnode
	// 根据 vnode.props 将组件所有的属性，根据组件是否声明解析为组件 props 与 attrs，放到组件实例上
	initProps(instance, props)
	// 根据 vnode.children 初始化组件的插槽
	initSlots(instance, children)
	// 代理组件实例，处理 this 指向，实现 this.xxxKey 访问到 data 和 props 中对应的属性
	instance.proxy = new Proxy(instance, PublicInstanceProxyHandlers)

	const { setup } = type
	if (setup) {
		// setup 的第二个参数
		const setupContext = {
			attrs: instance.attrs,
			emit: (event, ...agrs) => {
				const eventName = `on${event[0].toUpperCase() + event.slice(1)}`
				const handler = instance.attrs[eventName]
				handler && handler(...agrs)
			},
			expose(exposed) {
				instance.exposed = exposed
			},
			slots: instance.slots,
		}
		// setup 函数执行前，将当前实例放在全局上去，使得在 setup 函数内能够访问到当前实例
		setCurrentInstance(instance)
		const setupRes = setup(instance.props, setupContext)
		// setup 函数执行后，从全局清除，当前实例只能在 setup 函数内访问到
		setCurrentInstance(null)

		if (isFunction(setupRes)) {
			instance.render = setupRes
		} else {
			instance.setupState = proxyRefs(setupRes) // 模板中（即 render 中）使用 ref 自动拆包
		}
	}

	// 处理 data
	let data = type.data
	if (data) {
		// vue2 传递的data
		if (isFunction(data)) {
			instance.data = reactive(data.call(instance.proxy))
		}
	}
	if (!instance.render) {
		instance.render = type.render //  组件的 render 函数设置到实例上
	}
}

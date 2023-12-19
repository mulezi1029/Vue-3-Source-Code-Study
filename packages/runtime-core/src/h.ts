import { isObject } from '@vue/shared'
import { createVNode, isVNode, Text } from './vnode'

// h 根据传入的参数实现重载效果
export function h(type: any, propsOrChildren?: any, children?: any) {
	const length = arguments.length

	// 只有一个参数:type only: h('div')
	if (length === 1) {
		return createVNode(type)
	}
	// 有三个以上的参数，第一个参数是type，第二个参数必须是 props，剩下的参数是children
	//  type props children: h('div', { id: 'app' }, 'hello', 'world')
	else if (length > 3) {
		children = Array.from(arguments).slice(2) // 变为数组
		return createVNode(type, propsOrChildren, children)
	}
	// 两个参数：可能是 type props，可能是type children
	// h(type, {})  h(type, vnode)  h(type, 'text')  h(type, [])
	else if (length === 2) {
		// 第二个参数是对象且不是数组时：有两种情况 h(type,props)  h(type,vnode)
		if (isObject(propsOrChildren) && !Array.isArray(propsOrChildren)) {
			return isVNode(propsOrChildren)
				? createVNode(type, null, [propsOrChildren])
				: createVNode(type, propsOrChildren)
		} else {
			// 剩下的两种：数组、文本
			return createVNode(type, null, propsOrChildren) // 数组或者文本
		}
	}
	// 三个参数:肯定有 type 和 props，第三个参数的children 可能是 vnode，text，array，只要不是array，就变为array
	else if (length === 3) {
		if (isVNode(children)) {
			return createVNode(type, propsOrChildren, [children])
		}
		return createVNode(type, propsOrChildren, children) // 数组或者文本
	}
}

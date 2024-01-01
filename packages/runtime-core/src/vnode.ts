import { isObject, isString } from '@vue/shared'
import { shapeFlags } from 'packages/shared/src/shapeFlags'

export const Text = Symbol('text')
export const Fragment = Symbol('fragment')

export function isVNode(vnode) {
	return vnode.__v_isVnode === true
}

export function isSameVNodeType(n1, n2) {
	return n1.type === n2.type && n1.key === n2.key
}

/**
 * 最底层用于创建最基本的虚拟节点的API
 * @param type
 * @param props
 * @param children
 * @returns
 */
export function createVNode(type: any, props?: any, children?: any) {
	// shapeFlag 标识用来区分对应虚拟节点(包括子级)的类型
	const shapeFlag = isString(type) ? shapeFlags.ELEMENT : isObject(type) ? shapeFlags.COMPONENT : 0
	// type 是字符串就是元素类型，是对象就是组件类型

	// 创建虚拟节点：目前只具备最基本的结构
	const vnode = {
		__v_isVnode: true,
		type,
		props,
		children,
		shapeFlag,
		key: props?.key,
		el: null,
		component: null, // 组件的话才会赋值，否则就是 null
	}

	if (children) {
		// children 要么是数组要么是插槽要么是文本
		const type = isString(children)
			? shapeFlags.TEXT_CHILDREN
			: isObject(children)
			? shapeFlags.SLOTS_CHILDREN
			: shapeFlags.ARRAY_CHILDREN
		vnode.shapeFlag |= type
	}

	return vnode
}

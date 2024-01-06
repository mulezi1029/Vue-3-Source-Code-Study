import { isVNode } from './vnode'
import { getCurrentInstance } from './component'
import { shapeFlags } from 'packages/shared/src/shapeFlags'
import { onMounted, onUpdated } from './apiLifeCycle'

// KeepAlive 组件概述：
// 使用 KeepAlive 组件：KeepAlive 组件内部包裹需要被缓存的组件（被缓存的组件作为 keepalive 组件的插槽）
// KeepAlive 组件功能：
// 1. 正常渲染包裹的组件
// 2. 缓存该组件，在进行卸载时，不实际卸载该组件
export const KeepAliveImpl = {
	name: 'keep-alive',
	__isKeepAlive: true,
	setup(props, { slots }) {
		let pendingKey
		const keys = new Set() // 需要被缓存的组件的 key
		const cache = new Map() // key --> 组件
		const instance = getCurrentInstance() // keep-alive 组件实例
		let { move, createElement } = instance.ctx.renderer
		const cacheSubTree = () => {
			if (pendingKey) {
				cache.set(pendingKey, instance.subTree) // 缓存被keepalive包裹的组件实例
			}
		}

		const storageContainer = createElement('div') // 被keep-alive缓存的组件卸载时，不进行卸载，而是将其移到这个不在页面上的元素中隐藏起来

		onMounted(cacheSubTree) // 注册keep-alive的挂载完成生命周期钩子，keep-alive 组件挂载完成后，缓存被 keep-alive 包裹的组件的虚拟节点
		onUpdated(cacheSubTree) // 注册keep-alive的更新完成生命周期钩子，keep-alive 组件更新完成后，缓存被 keep-alive 包裹的组件的虚拟节点

		instance.ctx.activate = function (vnode, container) {
			console.log(vnode.type.name, 'activate')
			move(vnode, container)
		}

		instance.ctx.deActivate = function (vnode) {
			console.log(vnode.type.name, 'deActivate')

			move(vnode, storageContainer)
			vnode.shapeFlag |= shapeFlags.COMPONENT_KEPT_ALIVE
		}

		const render = () => {
			const vnode = slots.default() // 创建被 keep-alive 包裹的组件的虚拟节点
			if (!isVNode(vnode) || !(vnode.shapeFlag & shapeFlags.STATEFUL_COMPONENT)) {
				// 不是虚拟节点或者不是组件，不缓存
				return vnode
			}
			const compObj = vnode.type
			const key = vnode?.props?.key == null ? compObj : vnode?.props?.key
			pendingKey = key
			const hasCached = cache.has(key) // 是否缓存过该组件
			if (!hasCached) {
				// 没有缓存过
				keys.add(key)
			} else {
				// 缓存过
				const cacheVnode = cache.get(key) // 获取缓存的虚拟节点
				vnode.component = cacheVnode.component // 复用组件实例
				vnode.shapeFlag |= shapeFlags.COMPONENT_KEPT_ALIVE // 标识该组件的已经被缓存过
			}
			// 标识该组件需要缓存，后面卸载时不进行卸载，而是复用结构
			vnode.shapeFlag |= shapeFlags.COMPONENT_SHOULD_KEEP_ALIVE
			return vnode
		}

		// keep-alive 的 render 函数返回被 keep-alive 包裹的组件虚拟节点
		return render
	},
}

export const isKeepAlive = (vnode) => vnode.type.__isKeepAlive

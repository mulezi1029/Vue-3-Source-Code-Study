import { isVNode } from './vnode'
import { getCurrentInstance } from './component'
import { shapeFlags } from 'packages/shared/src/shapeFlags'
import { onMounted, onUpdated } from './apiLifeCycle'

// KeepAlive 组件概述：
// 使用 KeepAlive 组件：KeepAlive 组件内部包裹需要被缓存的组件（被缓存的组件作为 keepalive 组件的插槽）
// KeepAlive 组件功能：
// 1. 正常渲染包裹的组件
// 2. 缓存该组件，在进行卸载时，不实际卸载该组件
export const KeepAliveCopmImpl = {
	name: 'keep-alive',
	__isKeepAlive: true,
	props: {
		includes: String,
		excludes: String,
		max: Number,
	},
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

		const purneCacheEntry = (key) => {
			const cached = cache.get(key) // 获取缓存列表中应该被删除的组件
			cache.delete(key) // 删除第一个元素对应的缓存组件
			keys.delete(key) // 删除第一个元素
			_unmount(cached)
		}
		const _unmount = (vnode) => {
			// console.log(storageContainer)
			// 将组件虚拟节点的标识取消，使得后面能正常进入 unmount 逻辑
			let { shapeFlag } = vnode
			if (shapeFlag & shapeFlags.COMPONENT_KEPT_ALIVE) {
				shapeFlag -= shapeFlags.COMPONENT_KEPT_ALIVE
			}
			if (shapeFlag & shapeFlags.COMPONENT_SHOULD_KEEP_ALIVE) {
				shapeFlag -= shapeFlags.COMPONENT_SHOULD_KEEP_ALIVE
			}
			vnode.shapeFlag = shapeFlag
			// 同时要手动去调用 unmount 卸载 不被缓存的组件的 subTree 节点
			instance.ctx.renderer.unmount(vnode)
			// console.log(storageContainer)
		}
		const render = () => {
			// 创建被 keep-alive 包裹的组件的虚拟节点
			const vnode = slots.default()
			// 如果不是虚拟节点或者不是组件，不缓存
			if (!isVNode(vnode) || !(vnode.shapeFlag & shapeFlags.STATEFUL_COMPONENT)) {
				return vnode
			}
			const { includes, excludes, max } = props
			// 得到组件 name
			const name = vnode.type.name
			// 如果 keep-alive 组件内部包裹的组件不在 includes 中或者在 excludes 中，不缓存
			if (
				(includes && !includes.split(',').includes(name)) ||
				(excludes && excludes.split(',').includes(name))
			) {
				return vnode
			}
			const compObj = vnode.type // 被缓存的组件对象
			const key = (pendingKey = vnode?.props?.key == null ? compObj : vnode?.props?.key)
			const hasCached = cache.has(key) // 是否缓存过该组件
			if (!hasCached) {
				// 超过了缓存限制数
				if (max && keys.size >= max) {
					purneCacheEntry(keys.values().next().value)
				}
				// 没有缓存过
				keys.add(key)
			} else {
				// 缓存过
				const cacheVnode = cache.get(key) // 获取缓存的组件的虚拟节点
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

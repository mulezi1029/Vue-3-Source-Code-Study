// 创建与平台无关的渲染器

import { ReactieEffect, reactive } from '@vue/reactivity'
import { hasOwn, invokeArrayFns } from '@vue/shared'
import { shapeFlags } from 'packages/shared/src/shapeFlags'
import { createComponentInstane, setupComponent } from './component'
import { hasPropsChanged, initProps, updateProps } from './componentProps'
import { queueJob } from './scheduler'
import { updateSlots } from './slots'
import { Fragment, isSameVNodeType, Text } from './vnode'
// 渲染器用于将生成的虚拟节点转为平台的真实DOM
export function createRenderer(options) {
	const {
		insert: hostInsert,
		remove: hostRemove,
		patchProp: hostPatchProp,
		createElement: hostCreateElement,
		createText: hostCreateText,
		setText: hostSetText,
		setElementText: hostSetElementText,
		parentNode: hostParentNode,
		nextSibling: hostNextSibling,
	} = options

	const mountChildren = (children, el, parent) => {
		for (let i = 0; i < children.length; i++) {
			const child = children[i]
			patch(null, child, el, null, parent) // 这里直接调用 mountElement(child,el) 也可以吧？--- 不能直接mountElement，因为child可能是其他类型，不是element
		}
	}

	const unmountChildren = (children) => {
		for (let i = 0; i < children.length; i++) {
			const child = children[i]
			unmount(child)
		}
	}

	const patchProps = (el, oldProps, newProps) => {
		if (oldProps !== newProps) {
			for (let key in newProps) {
				const prevProp = oldProps[key]
				const nextProp = newProps[key]
				if (prevProp !== nextProp) {
					hostPatchProp(el, key, prevProp, nextProp)
				}
			}
			for (let key in oldProps) {
				if (!(key in newProps)) {
					hostPatchProp(el, key, oldProps[key], null)
				}
			}
		}
	}

	// 最长递增子序列
	function getSequence(arr) {
		let res = [0]
		let len = arr.length
		let p = arr.slice(0)
		for (let i = 1; i < len; i++) {
			let arrI = arr[i]
			let lastInd
			if (arrI !== 0) {
				lastInd = res[res.length - 1]
				if (arr[lastInd] < arrI) {
					res.push(i)
					p[i] = lastInd // 当前最后一项记住前一项索引
				} else {
					let start = 0
					let end = res.length - 1
					let ans
					while (start <= end) {
						let mid = Math.floor((start + end) / 2)
						if (arr[res[mid]] < arrI) {
							start = mid + 1
						} else {
							ans = mid
							end = mid - 1
						}
					}
					p[i] = res[ans - 1]
					res[ans] = i
				}
			}
		}
		// 修正
		for (let i = res.length - 1; i > 0; i--) {
			// debugger
			res[i - 1] = p[res[i]]
		}
		return res
	}

	// 全量的diff算法  比对过程是深度遍历  先遍历父亲  再遍历孩子
	const patchKeyedChildren = (c1, c2, el) => {
		let e1 = c1.length - 1
		let e2 = c2.length - 1
		let i = 0

		// 从前往后比：找到复用的节点
		while (i <= e1 && i <= e2) {
			const n1 = c1[i]
			const n2 = c2[i]
			if (isSameVNodeType(n1, n2)) {
				// 深度遍历
				patch(n1, n2, el)
			} else {
				break
			}
			i++
		}

		// 从后往前比：找到复用的节点
		while (i <= e1 && i <= e2) {
			const n1 = c1[e1]
			const n2 = c2[e2]
			if (isSameVNodeType(n1, n2)) {
				patch(n1, n2, el)
			} else {
				break
			}
			e1--
			e2--
		}
		// i  e1  e2
		// i > e1 时：表示新旧对比后，旧的全都被复用了，发现需要插入，而需要插入的是新的中从 i ~ e2

		// 单纯的新增：同序列挂载
		// 老的少，新的多，老的在新的里全部复用
		// a b c
		// a b c d
		if (i > e1) {
			// 有新增：要创建新节点
			// 判断相比于原来，是向前插入还是向后插入
			// 看 e2，如果 e2 往前移动了，那么 e2 的下一个值就存在，意味着向前插入
			// 如果 e2 没有移动，那么 e2 下一个就是空，意味着向后插入
			const nextPos = e2 + 1
			//vue2 是看下一个元素是否存在
			//vue3 是看下一个位置长度是否越界

			const anchor = nextPos < c2.length ? c2[nextPos].el : null

			while (i <= e2) {
				patch(null, c2[i], el, anchor)
				i++
			}
		}

		// 单纯的删除：同序列卸载
		// 老的多，新的少，新的全是复用老的
		// a b c d
		// 		 c d
		else if (i > e2) {
			while (i <= e1) {
				unmount(c1[i])
				i++
			}
		}

		// unkonwn sequence patch
		// a b [c d e] f g
		// a b [e c d h] f g
		else {
			let s1 = i // 老的中：s1 -> e1  c d e
			let s2 = i // 新的中：s2 -> e2  e c d h

			// 为了尽可能的复用：vue3 中根据新的 key 做一个映射表
			const keyToNewIndexMap = new Map()
			for (let i = s2; i <= e2; i++) {
				const vnode = c2[i]
				keyToNewIndexMap.set(vnode.key, i)
			}

			let toBePatched = e2 - s2 + 1
			let newIndexToOldIndexMap = new Array(toBePatched).fill(0) // 新的节点在老的children中对应的索引，最终还为0的表示这个新节点在老的中没有，需要新增

			// 遍历老的，看在新的中有没有，在新的中有，就要复用dom，对其进行递归 patch；在新的中没有，就要卸载。
			for (let i = s1; i <= e1; i++) {
				const oldChild = c1[i]
				const newIndex = keyToNewIndexMap.get(oldChild.key) // 老节点在新的中的可能索引
				// 1. 老节点在新的中不存在，需要卸载
				if (newIndex == undefined) {
					unmount(oldChild)
				}
				// 2. 老的节点在新的中存在，复用节点，更新props和children
				else {
					// 1. 记录在老的中的位置
					newIndexToOldIndexMap[newIndex - s2] = i + 1
					// 2. 复用节点
					const newChild = c2[newIndex]
					patch(oldChild, newChild, el)
				}
			}
			// 到这里，只是做到复用了老节点（更新了复用节点的属性等），但是没有调整老节点到正确的位置以及没有做到添加新的中有老的中没有的节点

			// 下面进行调整位置与添加新的节点,目前老的都复用完了、删除完了, 只要看新的去调整位置、增加节点即可
			// a b [c d e] f g
			// a b [e c d h] f g
			const increasingSeq = getSequence(newIndexToOldIndexMap) // 最终是一个递增序列
			let j = increasingSeq.length - 1

			// 倒插法
			for (let i = toBePatched - 1; i >= 0; i--) {
				const opIndex = s2 + i
				const opChild = c2[opIndex]
				const anchor = opIndex + 1 < c2.length ? c2[opIndex + 1].el : null
				// 新的中有，老的中没有，插入
				if (newIndexToOldIndexMap[i] === 0) {
					patch(null, opChild, el, anchor)
				}
				// 新的老的都有,移动位置
				else {
					// 倒序插入，比较暴力，整个都做了移动
					// hostInsert(opChild.el, el, anchor)
					if (i !== increasingSeq[j]) {
						hostInsert(opChild.el, el, anchor)
					} else {
						j--
					}
				}
			}
		}
	}

	const patchChildren = (n1, n2, container) => {
		// 比较两个 children 的差异，更新 container 的孩子
		// 新旧各有三种情况：组合起来共有九种情况
		// 新：文本、数组、空
		// 旧：文本、数组、空
		const { children: c1, shapeFlag: prevShapeFlag } = n1
		const { children: c2, shapeFlag: nextShapeFlag } = n2

		// 新:文本
		if (nextShapeFlag & shapeFlags.TEXT_CHILDREN) {
			if (prevShapeFlag & shapeFlags.ARRAY_CHILDREN) {
				unmountChildren(c1)
			}
			if (c1 !== c2) {
				hostSetElementText(container, c2)
			}
		}

		// 新:数组
		if (nextShapeFlag & shapeFlags.ARRAY_CHILDREN) {
			// 旧：数组
			if (prevShapeFlag & shapeFlags.ARRAY_CHILDREN) {
				// 数组比较：最复杂的diff
				patchKeyedChildren(c1, c2, container)
			}
			// 旧非数组
			else {
				// 旧：文本
				if (prevShapeFlag & shapeFlags.TEXT_CHILDREN) {
					hostSetElementText(container, '')
				}
				mountChildren(c2, container, parent)
			}
		}

		// 新:空
		if (c2 == null) {
			if (prevShapeFlag & shapeFlags.ARRAY_CHILDREN) {
				unmountChildren(c1)
			} else if (prevShapeFlag & shapeFlags.TEXT_CHILDREN) {
				hostSetElementText(container, '')
			}
		}
	}

	const patchElement = (n1, n2) => {
		const el = (n2.el = n1.el) // 复用 dom

		const oldProps = n1.props || {}
		const newProps = n2.props || {}

		// 对比新旧 props，更新 props
		patchProps(el, oldProps, newProps)

		// 对比新旧 children，更新 children
		patchChildren(n1, n2, el)
	}

	const mountElement = (vnode, container, anchor, parent) => {
		const { type, props, children, shapeFlag } = vnode
		// 1. 创建元素，并存到 vnode 上
		const el = (vnode.el = hostCreateElement(type))

		// 2. 设置属性
		if (props) {
			for (let key in props) {
				hostPatchProp(el, key, null, props[key])
			}
		}

		// 3. 处理子节点：children 要么是数组要么是文本
		if (shapeFlag & shapeFlags.TEXT_CHILDREN) {
			hostSetElementText(el, children)
		} else if (shapeFlag & shapeFlags.ARRAY_CHILDREN) {
			mountChildren(children, el, parent)
		}

		// 4. 添加到页面显示
		hostInsert(el, container, anchor) // 插入真实dom
	}

	const processElement = (n1, n2, container, anchor, parent) => {
		// 该类型的 vnode 是初次渲染
		if (n1 === null) {
			mountElement(n2, container, anchor, parent)
		}
		// 复用节点
		// diff 更新：对比两个虚拟节点，得到差异，然后更新dom
		else {
			patchElement(n1, n2)
		}
	}

	const processText = (n1, n2, container) => {
		// debugger
		let el
		// 初次渲染
		if (n1 == null) {
			// 创建文本元素
			el = n2.el = hostCreateText(n2.children)
			// 添加到页面显示
			hostInsert(el, container)
		} else {
			// 复用节点
			el = n2.el = n1.el
			// 文本更新
			if (n1.children !== n2.children) {
				hostSetText(el, n2.children)
			}
		}
	}

	const processFragment = (n1, n2, container, parent) => {
		// Fragment 类型的虚拟节点实际要渲染到页面上的是它的 children
		if (n1 == null) {
			mountChildren(n2.children, container, parent)
		} else {
			patchKeyedChildren(n1.children, n2.children, container)
		}
	}

	const mountComponent = (vnode, container, anchor, parent) => {
		// 组件实际被渲染到页面的是组件封装的 UI 结构的虚拟节点 subTree
		// 组件虚拟节点中, props 是传给组件的所有属性props, children 是组件的插槽
		// 所有属性中,被组件声明了的称为组件 props, 未被声明的称为 attrs
		// vnode 指的是组件的虚拟节点  要渲染的 vnode 中 render 函数返回的虚拟节点 subTree

		// 1) 根据组件 vnode 创建组件实例，并将组件实例记录到组件虚拟节点的 component 属性上
		const instance = (vnode.component = createComponentInstane(vnode, parent))
		// 2）根据 vnode 中存放的信息，初始化组件实例，设置属性等数据
		setupComponent(instance)
		// 3）创建组件渲染 effect，收集依赖
		setupRenderEffect(instance, container, anchor)
	}

	const updateComponentPreRender = (instance, nextVNode) => {
		instance.nextVNode = null
		instance.vnode = nextVNode // 更新实例的虚拟节点为新的虚拟节点
		updateProps(instance, nextVNode.props) // 更新组件 props
		updateSlots(instance, nextVNode.children) // 更新插槽
	}

	const setupRenderEffect = (instance, container, anchor) => {
		let render = instance.render
		// componentFn 执行过程中会进行依赖收集
		const componentFn = () => {
			const { bm, m } = instance // 获取组件实例的钩子函数

			// 组件挂载之前，调用 bm 钩子：此时调用钩子时 setup 函数早已运行完成，currentInstance 已经清空了
			if (bm) {
				invokeArrayFns(bm) // 此时执行钩子函数，是在 setup函数执行后的，全局记录组件实例的都清空了，获取不到了组件实例，需要再次进行处理
			}

			// 1. 组件初次挂载
			if (!instance.isMounted) {
				const subTree = render.call(instance.proxy, instance.proxy) // 获取组件要被渲染的UI结构的虚拟节点，改变 this 指向为组件实例的代理
				patch(null, subTree, container, anchor, instance) // 渲染虚拟节点
				instance.subTree = subTree // 组件实例缓存第一次渲染产生的 vnode
				instance.isMounted = true // 标志组件已经挂载过
			}

			// 组件挂载完成执行钩子
			if (m) {
				invokeArrayFns(m)
			}

			// 2. 组件非初次挂载
			else {
				const { bu, u } = instance
				// 组件更新：1. 组件本身的属性、插槽变化引起的更新  2. 组件内依赖的状态变化引起的更新
				const { nextVNode } = instance
				if (nextVNode) {
					// 更新组件属性、插槽
					updateComponentPreRender(instance, nextVNode)
				}

				// 组件更新前钩子
				if (bu) {
					invokeArrayFns(bu)
				}

				const subTree = render.call(instance.proxy, instance.proxy) // 获取组件要被渲染的新节点 this 指向组件实例的代理
				// 组件状态更新
				patch(instance.subTree, subTree, container, anchor)
				instance.subTree = subTree // 组件更新产生的新 vnode

				// 组件更新后钩子
				if (u) {
					invokeArrayFns(u)
				}
			}
		}

		const effect = new ReactieEffect(componentFn, () => {
			// 异步更新逻辑
			queueJob(update)
		})

		const update = (instance.update = effect.run.bind(effect))
		update() // 执行组件更新
	}

	const shouldUpdateComponent = (n1, n2) => {
		const { props: prevProps, children: preChildren } = n1
		const { props: nextProps, children: nextChildren } = n2 // 组件插槽
		if (preChildren || nextChildren) return true
		if (prevProps === nextProps) return false
		return hasPropsChanged(prevProps, nextProps)
	}

	const updateComponent = (n1, n2) => {
		const instance = (n2.component = n1.component) // 复用组件实例

		// 根据组件属性与插槽是否改变，来判断是否应该进行更新属性与插槽
		if (shouldUpdateComponent(n1, n2)) {
			// 更新组件属性 插槽  根据新的组件虚拟节点
			instance.nextVNode = n2 // 组件实例记录新的组件虚拟节点
			instance.update() // 组件 effect 重新执行进行更新
		}
	}

	const processComponent = (n1, n2, container, anchor, parent) => {
		// 组件初次渲染
		if (n1 === null) {
			mountComponent(n2, container, anchor, parent)
		}
		// 组件更新: 组件实例复用，更新组件的属性、插槽等
		else {
			updateComponent(n1, n2)
		}
	}

	// 每种类型：如 文本、元素、组件等，考虑三方面：初次渲染，复用更新，卸载
	const patch = (n1, n2, container, anchor = null, parent = null) => {
		if (n1 === n2) return

		// 处理旧节点：判断旧节点要不要卸载：新旧类型不一样，卸载旧的
		// n1 有并 n1 与 n2 不是相同类型 vnode ，则要卸载 n1 后去渲染 n2
		if (n1 && !isSameVNodeType(n1, n2)) {
			unmount(n1)
			n1 = null
		}

		// 判断要被渲染的 vnode 的类型，进入对应类型的处理逻辑
		const { type, shapeFlag } = n2
		switch (type) {
			// 处理文本
			case Text:
				processText(n1, n2, container)
				break
			case Fragment:
				processFragment(n1, n2, container, parent)
				break
			default:
				// 处理元素
				if (shapeFlag & shapeFlags.ELEMENT) {
					processElement(n1, n2, container, anchor, parent)
				}
				// 处理组件
				else if (shapeFlag & shapeFlags.COMPONENT) {
					processComponent(n1, n2, container, anchor, parent)
				}
		}
	}

	const unmountComponent = (subTree) => {
		return unmount(subTree)
	}

	// 页面中删除 vnode 对应的节点:
	// 1. Fragment --> 卸载 children
	// 2. Text --> 卸载 el
	// 3. Element --> 卸载 el
	// 4. Component --> 卸载 subTree
	const unmount = (vnode) => {
		const { shapeFlag } = vnode
		// 删除 vnode 对应在页面上的真实节点
		// 如果 vnode 标识的节点本身也被渲染在页面上，就删除其对应的节点
		// 如果 vnode 本身标识的结构实际上不被渲染到页面，页面上渲染的是 vnode 的 children，则要卸载其 children
		if (vnode.type === Fragment) {
			return unmountChildren(vnode.children) // 递归删除子节点
		} else if (shapeFlag & shapeFlags.COMPONENT) {
			// 卸载组件
			return unmountComponent(vnode.component.subTree)
		}

		hostRemove(vnode.el) // 删除节点
	}

	/* 渲染器：将 vnode 变为真实 DOM 渲染到 container 中*/
	const render = (vnode, container) => {
		// 卸载：删除节点
		if (vnode === null) {
			// 渲染过才能够卸载
			if (container._vnode) {
				unmount(container._vnode)
			}
		}
		// 初次渲染或者更新
		// 初次渲染：要根据 vnode 创建真实的 dom，处理属性，子节点等，最后挂载到页面中
		// 更新：需要对比先前的 vnode 和新的 vnode，得到差异，然后进行更新 dom
		else {
			patch(container._vnode || null, vnode, container)
		}
		// 渲染后 container 保存被渲染的虚拟节点，后面用于 diff 比对操作
		container._vnode = vnode
	}

	return {
		render,
	}
}

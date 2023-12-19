// 创建与平台无关的渲染器

import { shapeFlags } from 'packages/shared/src/shapeFlags'
import { isSameVNodeType, Text } from './vnode'
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

	const mountChildren = (children, el) => {
		for (let i = 0; i < children.length; i++) {
			const child = children[i]
			patch(null, child, el) // 这里直接调用 mountElement(child,el) 也可以吧？
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
	const patchKeyedChildren = (c1, c2, el) => {
		// 全量的diff算法  比对过程是深度遍历  先遍历父亲  再遍历孩子
		let e1 = c1.length - 1
		let e2 = c2.length - 1
		let i = 0

		// 从前往后比
		while (i <= e1 && i <= e2) {
			const n1 = c1[i]
			const n2 = c2[i]
			if (isSameVNodeType(n1, n2)) {
				// 深度遍历
				patch(n1, n2, el) // 为什么是 patch，而不是直接调用 patchElement(n1,n2)？
			} else {
				break
			}
			i++
		}

		// 从后往前比
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
		// e1 < i 时：表示新旧对比后，发现需要插入，而需要插入的是新的中从 i ~ e2

		//单纯的新增被称为：同序列挂载
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
			if (newIndex == undefined) {
				// 该老节点在新的中不存在，需要卸载
				unmount(oldChild)
			} else {
				// 老的节点在新的中存在
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
			if (newIndexToOldIndexMap[i] === 0) {
				patch(null, opChild, el, anchor)
			} else {
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

	const patchChildren = (n1, n2, container) => {
		// 比较两个 children 的差异，更新 container 的孩子
		// 新旧各有三种情况：组合起来共有九种情况
		// 新：文本、数组、空
		// 旧：文本、数组、空
		const { children: c1, shapeFlag: prevShapeFlag } = n1
		const { children: c2, shapeFlag: nextShapeFlag } = n2

		// 新:文本
		if (nextShapeFlag & shapeFlags.TEXT_CHILDREN) {
			// 旧：数组
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
				mountChildren(c2, container)
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

		// 对比新旧props
		patchProps(el, oldProps, newProps)

		// 对比新旧children
		patchChildren(n1, n2, el)
	}

	const mountElement = (vnode, container, anchor) => {
		const { type, props, children, shapeFlag } = vnode
		// 创建元素
		const el = (vnode.el = hostCreateElement(type))
		// 设置属性
		if (props) {
			for (let key in props) {
				hostPatchProp(el, key, null, props[key])
			}
		}
		// 处理子节点
		// children 要么是数组要么是文本
		if (shapeFlag & shapeFlags.TEXT_CHILDREN) {
			hostSetElementText(el, children)
		} else if (shapeFlag & shapeFlags.ARRAY_CHILDREN) {
			mountChildren(children, el)
		}
		// 添加到页面显示
		hostInsert(el, container, anchor) // 插入真实dom
	}

	const processElement = (n1, n2, container, anchor) => {
		if (n1 === null) {
			// 该类型的 vnode 是初次渲染
			mountElement(n2, container, anchor)
		} else {
			// 复用节点
			// diff 更新：对比两个虚拟节点，得到差异，然后更新dom
			patchElement(n1, n2)
		}
	}
	const processText = (n1, n2, container) => {
		if (n1 === null) {
			// 该类型的 vnode 是初次渲染
			// 创建文本元素
			console.dir((n2.el = hostCreateText(n2.children)))
			const el = (n2.el = hostCreateText(n2.children))
			hostInsert(el, container)
		} else {
			// 复用节点
			n2.el = n2.el
			if (n1.children !== n2.children) {
				hostSetText(container, n2.children) // 文本更新
			}
		}
	}
	/**
	 * patch 函数：根据传入的新旧 vnode，确定是要进行初次渲染新的vnode，还是要diff新旧
	 * @param n1 旧 vnode
	 * @param n2 新 vnode
	 * @param container 要被渲染到的 dom 容器
	 * @param anchor
	 * @returns
	 */
	// 每增加一种类型：如 文本、元素... 考虑三方面：初次渲染，复用更新，卸载
	const patch = (n1, n2, container, anchor = null) => {
		if (n1 === n2) return

		// n1 有并 n1 与 n2 不是相同类型 vnode ，则要卸载 n1，去渲染 n2
		if (n1 && !isSameVNodeType(n1, n2)) {
			unmount(n1)
			n1 = null
		}

		const { type, shapeFlag } = n2
		switch (type) {
			// 处理文本
			case Text:
				processText(n1, n2, container)
				break

			default:
				// 处理元素
				if (shapeFlag & shapeFlags.ELEMENT) {
					processElement(n1, n2, container, anchor)
				}
				break
		}
	}

	// 页面中删除 vnode 对应的节点
	const unmount = (vnode) => {
		hostRemove(vnode.el) // 删除真实dom
	}

	/* 渲染器：将 vnode 变为真实 DOM 渲染到 container 中*/
	const render = (vnode, container) => {
		// 卸载：删除节点
		if (vnode === null) {
			debugger
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

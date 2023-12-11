// DOM 节点操作的 API
/**
 * 将childEle节点插入到parent中的anchor描点之前
 * @param {Node} child
 * @param {Element} parent
 * @param {Node|undefined|null} anchor
 */
const insert = (child: Node, parent: Element, anchor: Node | undefined | null) => {
	parent.insertBefore(child, anchor || null) // anchor 为 null 时相当于 parent.appendChild(child)
}

/**
 * 移除child节点
 * @param child
 */
const remove = (child: Node) => {
	const parent = child.parentNode
	if (parent) {
		parent.removeChild(child)
	}
}
/**
 * 根据传入的selector查找元素节点
 * @param selector
 * @returns
 */
const querySelector = (selector) => {
	return document.querySelector(selector)
}

/**
 * 根据传入的node节点查找父节点
 * @param node
 * @returns
 */
const parentNode = (node) => {
	return node.parentNode
}

/**
 * 根据传入的node节点查找下一个兄弟节点
 * @param node
 * @returns
 */
const nextSibling = (node) => {
	return node.nextSibling
}

/**
 * 创建指定tagName的元素节点
 * @param tagName
 * @returns
 */
const createElement = (tagName) => {
	return document.createElement(tagName)
}

/**
 * 根据text值创建文本节点
 * @param text
 */
const createText = (text) => {
	document.createTextNode(text)
}

/**
 * 将el节点的节点值设为text值
 * @param el
 * @param text
 */
const setText = (el, text) => {
	el.nodeValue = text
}
/**
 * 将el元素节点的内容设为text值
 * @param el
 * @param text
 */

const setElementText = (el, text) => {
	el.textContent = text
}
export const nodeOps = {
	insert,
	remove,
	querySelector,
	parentNode,
	nextSibling,
	createElement,
	createText,
	setText,
	setElementText,
}

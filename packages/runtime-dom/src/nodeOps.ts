// DOM 节点操作的 API
export const nodeOps = {
	insert(childEle, parent, anchor) {
		parent.insertBefore(childEle, anchor || null) // anchor 为 null 时相当于 parent.appendChild(childEle)
	},
	remove(child) {
		const parent = child.pareNode
		if (parent) {
			parent.removeChild(child)
		}
	},
	querySelector(selector) {
		return document.querySelector(selector)
	},
	parentNode(node) {
		return node.parentNode
	},
	nextSibling(node) {
		return node.nextSibling
	},
	createElement(tagName) {
		return document.createElement(tagName)
	},
	createText(text) {
		document.createTextNode(text)
	},
	setText(el, text) {
		el.nodeValue = text
	},
	setElementText(el, text) {
		el.textContent = text
	},
}

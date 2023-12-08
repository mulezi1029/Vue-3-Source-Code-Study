/**
 * 根据传入的value设置el节点的 calssName 属性
 * @param el
 * @param value
 */
export const patchClass = (el, value) => {
	if (value == null) {
		el.removeAttribute('class')
	} else {
		el.className = value
	}
}

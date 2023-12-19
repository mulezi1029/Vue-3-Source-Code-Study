/**
 * 根据perValue与nextValue，设置el节点的style属性
 * @param el
 * @param preValue
 * @param nextValue
 */
export const patchStyle = (el, preValue, nextValue) => {
	if (nextValue) {
		const style = (el as HTMLElement).style
		// 先将新的对象中的属性设置到style上
		for (const key in nextValue) {
			style[key] = nextValue[key]
		}
		// 原来有的属性在新值中没有的话要删除
		for (const key in preValue) {
			if (!nextValue[key]) {
				style[key] = ''
			}
		}
	} else {
		el.removeAttribute('style') // 如果nextValue为空，则删除style属性')
	}
}

// 设置属性的操作
import { patchClass } from './module/class'
import { patchStyle } from './module/style'

/**
 *
 * @param el 节点元素
 * @param key 属性名
 * @param preVal 之前的值
 * @param nextVal 新值
 */
export const patchProp = (el, key, preVal, nextVal) => {
	if (key === 'class') {
		// class
		patchClass(el, nextVal)
	} else if (key === 'style') {
		// style
		patchStyle(el, preVal, nextVal)
	} else if (/^on[^a-z]/.test(key)) {
		// event
	} else {
		// attr
	}
}

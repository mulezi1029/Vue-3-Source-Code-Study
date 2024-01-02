// 设置属性操作API
import { patchAttrs } from './module/attr'
import { patchClass } from './module/class'
import { patchEvents } from './module/events'
import { patchStyle } from './module/style'

/**
 *
 * @param {Element} el 节点元素
 * @param key 属性名
 * @param preVal 之前的值
 * @param nextVal 新值
 */
export const patchProp = (el: Element, key, preVal, nextVal) => {
	// class
	if (key === 'class') {
		patchClass(el, nextVal)
	}
	// style
	else if (key === 'style') {
		patchStyle(el, preVal, nextVal)
	}
	// event
	else if (/^on[^a-z]/.test(key)) {
		patchEvents(el, key, preVal, nextVal)
	}
	// attr
	else {
		patchAttrs(el, key, nextVal)
	}
}

import { reactive } from '@vue/reactivity'

// 初始化组件属性：props 与 attrs
// 1. 生成 vnode 时传入的第二个参数是组件所有的属性
// 2. 所有属性中属于组件对象 props 选项中声明的属性加入到组件实例的 props 中
// 3. 剩下的属性加入到实例的 attrs 中
export function initProps(instance, rawProps) {
	const props = {}
	const attrs = {}
	const propsOptions = instance.propsOptions || {}
	if (rawProps) {
		for (const key in rawProps) {
			if (key in propsOptions) {
				props[key] = rawProps[key]
			} else {
				attrs[key] = rawProps[key]
			}
		}
	}
	instance.props = reactive(props) // 源码上用的是 shallowReactive ，原则上只需要使用浅层的代理即可
	instance.attrs = attrs
}

export function updateProps(instance, nextRawProps) {
	const { props: instanceProps, propsOptions, attrs } = instance
	for (const key in nextRawProps) {
		if (key in propsOptions) {
			instanceProps[key] = nextRawProps[key]
		} else {
			attrs[key] = nextRawProps[key]
		}
	}
	for (const key in instanceProps) {
		if (!(key in nextRawProps)) {
			delete instanceProps[key]
		}
	}
}

export function hasPropsChanged(prevProps, nextProps) {
	// 判断组件属性是否变化
	const l1 = Object.keys(prevProps)
	const l2 = Object.keys(nextProps)
	if (l1.length !== l2.length) {
		return true
	}
	for (let i = 0; i < l1.length; i++) {
		const key = l2[i]
		if (prevProps[key] !== nextProps[key]) {
			return true
		}
	}
	return false
}

import { shapeFlags } from 'packages/shared/src/shapeFlags'

export function initSlots(instance, children) {
	if (children) {
		if (instance.vnode.shapeFlag & shapeFlags.SLOTS_CHILDREN) {
			instance.slots = children // 插槽绑定到实例上
		}
	}
}

export function updateSlots(instance, nextSlots) {
	if (nextSlots) {
		// instance.slots = nextSlots   // 不能直接重新赋值，因为setup的上下文中的 slots 是指向原来的 instance.slots 引用值
		Object.assign(instance.slots, nextSlots)
	}
}

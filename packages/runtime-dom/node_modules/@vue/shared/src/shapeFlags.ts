export const enum shapeFlags {
	ELEMENT = 1, // 表明该虚拟节点是一个元素
	FUNCTIONAL_COMPONENT = 1 << 1, // 表明该虚拟节点是一个函数组件
	STATEFUL_COMPONENT = 1 << 2, // 表明该虚拟节点是一个普通组件

	TEXT_CHILDREN = 1 << 3, // 表明该虚拟节点的children是一个文本
	ARRAY_CHILDREN = 1 << 4, // 表明该虚拟节点的children是一个数组

	SLOTS_CHILDREN = 1 << 5, // 表明该虚拟节点的children是一个插槽

	TELEPORT = 1 << 6, // 表明该虚拟节点是一个传送门
	SUSPENSE = 1 << 7, // 表明该虚拟节点是一个挂起节点
	COMPONENT_SHOULD_KEEP_ALIVE = 1 << 8,
	COMPONENT_KEPT_ALIVE = 1 << 9,
	COMPONENT = shapeFlags.STATEFUL_COMPONENT | shapeFlags.FUNCTIONAL_COMPONENT, // 表明该虚拟节点是一个组件节点
}

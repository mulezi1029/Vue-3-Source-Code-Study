/**
 * 创建实际绑定给事件的处理函数
 * @param initialValue
 * @returns
 */
function createInvoker(initialValue) {
	const invoker = (e) => invoker.value(e)
	invoker.value = initialValue
	return invoker
}
export const patchEvents = (el, key, preValue, nextVal) => {
	const invokers = el.vei || (el.vei = {}) // 取出该元素的所有事件回调的集合
	const name = key.slice(2).toLowerCase() //获取事件名称
	let existingInvoker = invokers[name] // 尝试从缓存中取出当前事件名称对应的invoker

	// 如果该事件名称下已经存在回调，并且有nextvalue，表明是更新事件
	if (existingInvoker && nextVal) {
		existingInvoker.value = nextVal
	}
	// 该事件名称下没有回调，并且有nextValue，表明是新增事件
	else if (!existingInvoker && nextVal) {
		const invoker = createInvoker(nextVal) // 创建要注册给事件处理的回调函数
		invokers[name] = invoker // 将其缓存在该元素的事件回调集合中
		el.addEventListener(name, invoker) // 注册事件
	}
	// 没有nextValue，表明移除事件
	else if (!nextVal) {
		el.removeEventLister(name, existingInvoker) // 移除事件
		invokers[name] = null // 缓存中删除
	}
}

// @click = fn1   @click = fn2
// invoker = (e) => invoker.fn(e)
// addEventListener(click,invoker)
// invoker.fn = fn1     -->     invoker.fn = fn2

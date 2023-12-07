export const patchStyle = (el, preValue, nextValue) => {
	const style = (el as HTMLElement).style

	for (const key in nextValue) {
		style[key] = nextValue[key]
	}
	// 老的有新的没有则要移除
	for (const key in preValue) {
		if (!nextValue[key]) {
			style[key] = ''
		}
	}
}

export const patchAttrs = (el, key, newValue) => {
	if (newValue) {
		el.setAttribute(key, newValue)
	} else {
		el.removeAttribute(key)
	}
}

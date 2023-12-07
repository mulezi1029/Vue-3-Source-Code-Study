export function isObject(obj: any): boolean {
	return obj !== null && typeof obj === 'object'
}

export function isFunction(value: any): boolean {
	return typeof value === 'function'
}

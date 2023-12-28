export function isObject(obj: any): boolean {
	return obj !== null && typeof obj === 'object'
}

export function isFunction(value: any): boolean {
	return typeof value === 'function'
}

export function isString(value: any): boolean {
	return typeof value === 'string'
}

const ownProperty = Object.prototype.hasOwnProperty
export const hasOwn = (key, value) => ownProperty.call(value, key)

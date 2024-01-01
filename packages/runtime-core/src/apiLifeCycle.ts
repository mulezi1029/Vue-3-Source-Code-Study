import { currentInstance, setCurrentInstance } from './component'

export const enum LifeCycleHooks {
	BEFORE_CREATE = 'bc',
	CREATED = 'c',
	BEFORE_MOUNT = 'bm',
	MOUNTED = 'm',
	BEFORE_UPDATE = 'bu',
	UPDATED = 'u',
	BEFORE_UNMOUNT = 'bum',
	UNMOUNTED = 'um',
	DEACTIVATED = 'da',
	ACTIVATED = 'a',
}

function createHook(type) {
	// hook 是用户传递的函数  onMounted( ()=>{} )
	// 获取到当前实例
	return (hook, target = currentInstance) => {
		if (target) {
			// 在 setup 中能获取到组件实例，生命周期钩子只能在 setup 中使用
			const hooks = target[type] || (target[type] = [])
			// 利用闭包保存当前实例，使得钩子调用时还能获取到当前组件实例
			const wrapperHook = () => {
				setCurrentInstance(target)
				hook()
				setCurrentInstance(null)
			}
			hooks.push(wrapperHook)
		}
	}
}

export const onBeforeMount = createHook(LifeCycleHooks.BEFORE_MOUNT)
export const onMounted = createHook(LifeCycleHooks.MOUNTED)
export const onBeforeUpdate = createHook(LifeCycleHooks.BEFORE_UPDATE)
export const onUpdated = createHook(LifeCycleHooks.UPDATED)
export const onBeforeUnmount = createHook(LifeCycleHooks.BEFORE_UNMOUNT)
export const onUnmounted = createHook(LifeCycleHooks.UNMOUNTED)

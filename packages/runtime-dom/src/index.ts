import { createRenderer } from 'packages/runtime-core/src/renderer'
import { nodeOps } from './nodeOps'
import { patchProp } from './patchProp'

// 浏览器渲染需要的DOM操作API
const renderOptions = Object.assign(nodeOps, { patchProp })

// console.log('浏览器渲染需要的DOM操作API', renderOptions)
  
// 针对浏览器渲染提供的 将虚拟DOM渲染为真实 DOM 的 render 渲染器
export const render = (vnode, container) => {
	return createRenderer(renderOptions).render(vnode, container)
}

export * from '@vue/runtime-core'

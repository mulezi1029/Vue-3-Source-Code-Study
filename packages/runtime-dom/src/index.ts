import { nodeOps } from './nodeOps'
import { patchProp } from './patchProp'

// 浏览器渲染需要的DOM操作API
const renderOptions = Object.assign(nodeOps, { patchProp })

// console.log('浏览器渲染需要的DOM操作API', renderOptions)

export * from '@vue/runtime-core'

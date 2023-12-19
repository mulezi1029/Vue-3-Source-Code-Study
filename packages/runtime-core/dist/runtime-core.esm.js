// packages/shared/src/index.ts
function isObject(obj) {
  return obj !== null && typeof obj === "object";
}
function isString(value) {
  return typeof value === "string";
}

// packages/runtime-core/src/vnode.ts
function isVNode(vnode) {
  return vnode.__v_isVnode === true;
}
function isSameVNode(n1, n2) {
  return n1.type === n2.type && n1.key === n2.key;
}
function createVNode(type, props, children) {
  const shapeFlag = isString(type) ? 1 /* ELEMENT */ : 0;
  const vnode = {
    __v_isVnode: true,
    type,
    props,
    children,
    shapeFlag,
    key: props?.key,
    el: null
  };
  if (children) {
    const type2 = isString(children) ? 8 /* TEXT_CHILDREN */ : 16 /* ARRAY_CHILDREN */;
    vnode.shapeFlag |= type2;
  }
  return vnode;
}

// packages/runtime-core/src/h.ts
function h(type, propsOrChildren, children) {
  const length = arguments.length;
  if (length === 1) {
    return createVNode(type);
  } else if (length > 3) {
    children = Array.from(arguments).slice(2);
    return createVNode(type, propsOrChildren, children);
  } else if (length === 2) {
    if (isObject(propsOrChildren) && !Array.isArray(propsOrChildren)) {
      return isVNode(propsOrChildren) ? createVNode(type, null, [propsOrChildren]) : createVNode(type, propsOrChildren);
    } else {
      return createVNode(type, null, propsOrChildren);
    }
  } else if (length === 3) {
    if (Array.isArray(children)) {
      return createVNode(type, propsOrChildren, children);
    } else {
      return createVNode(type, propsOrChildren, [children]);
    }
  }
}
export {
  createVNode,
  h,
  isSameVNode,
  isVNode
};
//# sourceMappingURL=runtime-core.esm.js.map

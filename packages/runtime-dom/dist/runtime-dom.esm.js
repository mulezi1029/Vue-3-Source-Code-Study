// packages/shared/src/index.ts
function isObject(obj) {
  return obj !== null && typeof obj === "object";
}
function isString(value) {
  return typeof value === "string";
}

// packages/runtime-core/src/vnode.ts
var Text = Symbol("text");
function isVNode(vnode) {
  return vnode.__v_isVnode === true;
}
function isSameVNodeType(n1, n2) {
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

// packages/runtime-core/src/renderer.ts
function createRenderer(options) {
  const {
    insert: hostInsert,
    remove: hostRemove,
    patchProp: hostPatchProp,
    createElement: hostCreateElement,
    createText: hostCreateText,
    setText: hostSetText,
    setElementText: hostSetElementText,
    parentNode: hostParentNode,
    nextSibling: hostNextSibling
  } = options;
  const mountChildren = (children, el) => {
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      patch(null, child, el);
    }
  };
  const unmountChildren = (children) => {
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      unmount(child);
    }
  };
  const patchProps = (el, oldProps, newProps) => {
    if (oldProps !== newProps) {
      for (let key in newProps) {
        const prevProp = oldProps[key];
        const nextProp = newProps[key];
        if (prevProp !== nextProp) {
          hostPatchProp(el, key, prevProp, nextProp);
        }
      }
      for (let key in oldProps) {
        if (!(key in newProps)) {
          hostPatchProp(el, key, oldProps[key], null);
        }
      }
    }
  };
  function getSequence(arr) {
    let res = [0];
    let len = arr.length;
    let p = arr.slice(0);
    for (let i = 1; i < len; i++) {
      let arrI = arr[i];
      let lastInd;
      if (arrI !== 0) {
        lastInd = res[res.length - 1];
        if (arr[lastInd] < arrI) {
          res.push(i);
          p[i] = lastInd;
        } else {
          let start = 0;
          let end = res.length - 1;
          let ans;
          while (start <= end) {
            let mid = Math.floor((start + end) / 2);
            if (arr[res[mid]] < arrI) {
              start = mid + 1;
            } else {
              ans = mid;
              end = mid - 1;
            }
          }
          p[i] = res[ans - 1];
          res[ans] = i;
        }
      }
    }
    for (let i = res.length - 1; i > 0; i--) {
      res[i - 1] = p[res[i]];
    }
    return res;
  }
  const patchKeyedChildren = (c1, c2, el) => {
    let e1 = c1.length - 1;
    let e2 = c2.length - 1;
    let i = 0;
    while (i <= e1 && i <= e2) {
      const n1 = c1[i];
      const n2 = c2[i];
      if (isSameVNodeType(n1, n2)) {
        patch(n1, n2, el);
      } else {
        break;
      }
      i++;
    }
    while (i <= e1 && i <= e2) {
      const n1 = c1[e1];
      const n2 = c2[e2];
      if (isSameVNodeType(n1, n2)) {
        patch(n1, n2, el);
      } else {
        break;
      }
      e1--;
      e2--;
    }
    if (i > e1) {
      const nextPos = e2 + 1;
      const anchor = nextPos < c2.length ? c2[nextPos].el : null;
      while (i <= e2) {
        patch(null, c2[i], el, anchor);
        i++;
      }
    } else if (i > e2) {
      while (i <= e1) {
        unmount(c1[i]);
        i++;
      }
    }
    let s1 = i;
    let s2 = i;
    const keyToNewIndexMap = /* @__PURE__ */ new Map();
    for (let i2 = s2; i2 <= e2; i2++) {
      const vnode = c2[i2];
      keyToNewIndexMap.set(vnode.key, i2);
    }
    let toBePatched = e2 - s2 + 1;
    let newIndexToOldIndexMap = new Array(toBePatched).fill(0);
    for (let i2 = s1; i2 <= e1; i2++) {
      const oldChild = c1[i2];
      const newIndex = keyToNewIndexMap.get(oldChild.key);
      if (newIndex == void 0) {
        unmount(oldChild);
      } else {
        newIndexToOldIndexMap[newIndex - s2] = i2 + 1;
        const newChild = c2[newIndex];
        patch(oldChild, newChild, el);
      }
    }
    const increasingSeq = getSequence(newIndexToOldIndexMap);
    let j = increasingSeq.length - 1;
    for (let i2 = toBePatched - 1; i2 >= 0; i2--) {
      const opIndex = s2 + i2;
      const opChild = c2[opIndex];
      const anchor = opIndex + 1 < c2.length ? c2[opIndex + 1].el : null;
      if (newIndexToOldIndexMap[i2] === 0) {
        patch(null, opChild, el, anchor);
      } else {
        if (i2 !== increasingSeq[j]) {
          hostInsert(opChild.el, el, anchor);
        } else {
          j--;
        }
      }
    }
  };
  const patchChildren = (n1, n2, container) => {
    const { children: c1, shapeFlag: prevShapeFlag } = n1;
    const { children: c2, shapeFlag: nextShapeFlag } = n2;
    if (nextShapeFlag & 8 /* TEXT_CHILDREN */) {
      if (prevShapeFlag & 16 /* ARRAY_CHILDREN */) {
        unmountChildren(c1);
      }
      if (c1 !== c2) {
        hostSetElementText(container, c2);
      }
    }
    if (nextShapeFlag & 16 /* ARRAY_CHILDREN */) {
      if (prevShapeFlag & 16 /* ARRAY_CHILDREN */) {
        patchKeyedChildren(c1, c2, container);
      } else {
        if (prevShapeFlag & 8 /* TEXT_CHILDREN */) {
          hostSetElementText(container, "");
        }
        mountChildren(c2, container);
      }
    }
    if (c2 == null) {
      if (prevShapeFlag & 16 /* ARRAY_CHILDREN */) {
        unmountChildren(c1);
      } else if (prevShapeFlag & 8 /* TEXT_CHILDREN */) {
        hostSetElementText(container, "");
      }
    }
  };
  const patchElement = (n1, n2) => {
    const el = n2.el = n1.el;
    const oldProps = n1.props || {};
    const newProps = n2.props || {};
    patchProps(el, oldProps, newProps);
    patchChildren(n1, n2, el);
  };
  const mountElement = (vnode, container, anchor) => {
    const { type, props, children, shapeFlag } = vnode;
    const el = vnode.el = hostCreateElement(type);
    if (props) {
      for (let key in props) {
        hostPatchProp(el, key, null, props[key]);
      }
    }
    if (shapeFlag & 8 /* TEXT_CHILDREN */) {
      hostSetElementText(el, children);
    } else if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
      mountChildren(children, el);
    }
    hostInsert(el, container, anchor);
  };
  const processElement = (n1, n2, container, anchor) => {
    if (n1 === null) {
      mountElement(n2, container, anchor);
    } else {
      patchElement(n1, n2);
    }
  };
  const processText = (n1, n2, container) => {
    if (n1 === null) {
      console.dir(n2.el = hostCreateText(n2.children));
      const el = n2.el = hostCreateText(n2.children);
      hostInsert(el, container);
    } else {
      n2.el = n2.el;
      if (n1.children !== n2.children) {
        hostSetText(container, n2.children);
      }
    }
  };
  const patch = (n1, n2, container, anchor = null) => {
    if (n1 === n2)
      return;
    if (n1 && !isSameVNodeType(n1, n2)) {
      unmount(n1);
      n1 = null;
    }
    const { type, shapeFlag } = n2;
    switch (type) {
      case Text:
        processText(n1, n2, container);
        break;
      default:
        if (shapeFlag & 1 /* ELEMENT */) {
          processElement(n1, n2, container, anchor);
        }
        break;
    }
  };
  const unmount = (vnode) => {
    hostRemove(vnode.el);
  };
  const render2 = (vnode, container) => {
    if (vnode === null) {
      debugger;
      if (container._vnode) {
        unmount(container._vnode);
      }
    } else {
      patch(container._vnode || null, vnode, container);
    }
    container._vnode = vnode;
  };
  return {
    render: render2
  };
}

// packages/runtime-dom/src/nodeOps.ts
var insert = (child, parent, anchor) => {
  parent.insertBefore(child, anchor || null);
};
var remove = (child) => {
  const parent = child.parentNode;
  if (parent) {
    parent.removeChild(child);
  }
};
var querySelector = (selector) => {
  return document.querySelector(selector);
};
var parentNode = (node) => {
  return node.parentNode;
};
var nextSibling = (node) => {
  return node.nextSibling;
};
var createElement = (tagName) => {
  return document.createElement(tagName);
};
var createText = (text) => {
  return document.createTextNode(text);
};
var setText = (el, text) => {
  el.nodeValue = text;
};
var setElementText = (el, text) => {
  el.textContent = text;
};
var nodeOps = {
  insert,
  remove,
  querySelector,
  parentNode,
  nextSibling,
  createElement,
  createText,
  setText,
  setElementText
};

// packages/runtime-dom/src/module/attr.ts
var patchAttrs = (el, key, newValue) => {
  if (newValue) {
    el.setAttribute(key, newValue);
  } else {
    el.removeAttribute(key);
  }
};

// packages/runtime-dom/src/module/class.ts
var patchClass = (el, value) => {
  if (value == null) {
    el.removeAttribute("class");
  } else {
    el.className = value;
  }
};

// packages/runtime-dom/src/module/events.ts
function createInvoker(initialValue) {
  const invoker = (e) => invoker.value(e);
  invoker.value = initialValue;
  return invoker;
}
var patchEvents = (el, key, preValue, nextVal) => {
  const invokers = el.vei || (el.vei = {});
  const name = key.slice(2).toLowerCase();
  let existingInvoker = invokers[name];
  if (existingInvoker && nextVal) {
    existingInvoker.value = nextVal;
  } else if (!existingInvoker && nextVal) {
    const invoker = createInvoker(nextVal);
    invokers[name] = invoker;
    el.addEventListener(name, invoker);
  } else if (!nextVal) {
    el.removeEventLister(name, existingInvoker);
    invokers[name] = null;
  }
};

// packages/runtime-dom/src/module/style.ts
var patchStyle = (el, preValue, nextValue) => {
  if (nextValue) {
    const style = el.style;
    for (const key in nextValue) {
      style[key] = nextValue[key];
    }
    for (const key in preValue) {
      if (!nextValue[key]) {
        style[key] = "";
      }
    }
  } else {
    el.removeAttribute("style");
  }
};

// packages/runtime-dom/src/patchProp.ts
var patchProp = (el, key, preVal, nextVal) => {
  if (key === "class") {
    patchClass(el, nextVal);
  } else if (key === "style") {
    patchStyle(el, preVal, nextVal);
  } else if (/^on[^a-z]/.test(key)) {
    patchEvents(el, key, preVal, nextVal);
  } else {
    patchAttrs(el, key, nextVal);
  }
};

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
    if (isVNode(children)) {
      return createVNode(type, propsOrChildren, [children]);
    }
    return createVNode(type, propsOrChildren, children);
  }
}

// packages/runtime-dom/src/index.ts
var renderOptions = Object.assign(nodeOps, { patchProp });
var render = (vnode, container) => {
  return createRenderer(renderOptions).render(vnode, container);
};
export {
  Text,
  createRenderer,
  createVNode,
  h,
  isSameVNodeType,
  isVNode,
  render
};
//# sourceMappingURL=runtime-dom.esm.js.map

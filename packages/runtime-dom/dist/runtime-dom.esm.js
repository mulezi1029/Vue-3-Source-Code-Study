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
  document.createTextNode(text);
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
  const style = el.style;
  for (const key in nextValue) {
    style[key] = nextValue[key];
  }
  for (const key in preValue) {
    if (!nextValue[key]) {
      style[key] = "";
    }
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

// packages/runtime-dom/src/index.ts
var renderOptions = Object.assign(nodeOps, { patchProp });
export {
  createVNode,
  h,
  isVNode
};
//# sourceMappingURL=runtime-dom.esm.js.map

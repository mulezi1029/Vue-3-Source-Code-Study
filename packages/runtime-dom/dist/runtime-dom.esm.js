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

// packages/runtime-dom/src/index.ts
var renderOptions = Object.assign(nodeOps, { patchProp });
console.log(renderOptions);
//# sourceMappingURL=runtime-dom.esm.js.map

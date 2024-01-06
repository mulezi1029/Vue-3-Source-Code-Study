// packages/shared/src/index.ts
function isObject(obj) {
  return obj !== null && typeof obj === "object";
}
function isFunction(value) {
  return typeof value === "function";
}
function isString(value) {
  return typeof value === "string";
}
var ownProperty = Object.prototype.hasOwnProperty;
var hasOwn = (key, value) => ownProperty.call(value, key);
function invokeArrayFns(fns, args) {
  fns.forEach((fn) => {
    fn(args);
  });
}

// packages/reactivity/src/effectScope.ts
var activeEffectScope;
var EffectScope = class {
  constructor() {
    this.active = true;
    this.effects = /* @__PURE__ */ new Set();
    this.parent = null;
  }
  run(fn) {
    if (this.active) {
      try {
        this.parent = activeEffectScope;
        activeEffectScope = this;
        return fn();
      } finally {
        activeEffectScope = this.parent;
        this.parent = null;
      }
    }
  }
  stop() {
    if (this.active) {
      for (const effect2 of this.effects) {
        effect2.stop();
      }
      this.active = false;
    }
  }
};
function recordEffectScope(effct) {
  if (activeEffectScope && activeEffectScope.active) {
    activeEffectScope.effects.add(effct);
  }
}
function effectScope() {
  return new EffectScope();
}

// packages/reactivity/src/effect.ts
var activeEffect;
var ReactieEffect = class {
  constructor(fn, scheduler) {
    this.fn = fn;
    this.scheduler = scheduler;
    // 控制这个函数是否需要响应性的开关标志
    this.active = true;
    this.parent = null;
    this.deps = [];
    recordEffectScope(this);
  }
  // 记录该响应性函数依赖的响应性属性的集合
  // 执行副作用函数，并在副作用函数执行过程中收集依赖
  run() {
    if (!this.active) {
      return this.fn();
    }
    try {
      this.parent = activeEffect;
      activeEffect = this;
      cleanupEffect(this);
      return this.fn();
    } finally {
      activeEffect = this.parent;
      this.parent = null;
    }
  }
  // 关闭副作用函数的响应性，使得内部依赖变化也不会触发执行
  stop() {
    console.log("\u5173\u95ED\u54CD\u5E94\u6027");
    if (this.active) {
      cleanupEffect(this);
      this.active = false;
    }
  }
};
function effect(fn, options = {}) {
  const _effect = new ReactieEffect(fn, options.scheduler);
  _effect.run();
  const runner = _effect.run.bind(_effect);
  runner.effect = _effect;
  return runner;
}
var targetMap = /* @__PURE__ */ new WeakMap();
function cleanupEffect(effect2) {
  const { deps } = effect2;
  for (const dep of deps) {
    dep.delete(effect2);
  }
  effect2.deps.length = 0;
}
function track(target, key) {
  if (!activeEffect) {
    return;
  }
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    targetMap.set(target, depsMap = /* @__PURE__ */ new Map());
  }
  let dep = depsMap.get(key);
  if (!dep) {
    depsMap.set(key, dep = /* @__PURE__ */ new Set());
  }
  trackEffects(dep);
}
function trackEffects(dep) {
  let shouldTrack = !dep.has(activeEffect);
  if (shouldTrack) {
    dep.add(activeEffect);
    activeEffect.deps.push(dep);
  }
}
function trigger(target, key, value, oldValue) {
  const depsMap = targetMap.get(target);
  if (!depsMap) {
    return;
  }
  const dep = depsMap.get(key);
  triggerEffects(dep);
}
function triggerEffects(dep) {
  if (dep) {
    const effects = [...dep];
    effects.forEach((effect2) => {
      if (activeEffect !== effect2) {
        if (!effect2.scheduler) {
          effect2.run();
        } else {
          effect2.scheduler();
        }
      }
    });
  }
}

// packages/reactivity/src/ref.ts
function toReactive(value) {
  return isObject(value) ? reactive(value) : value;
}
function isRef(value) {
  return value && value.__v_isRef;
}
var RefImpl = class {
  constructor(rawValue) {
    this.rawValue = rawValue;
    this.__v_isRef = true;
    this._value = toReactive(rawValue);
  }
  get value() {
    if (activeEffect) {
      trackEffects(this.dep || (this.dep = /* @__PURE__ */ new Set()));
    }
    return this._value;
  }
  set value(newValue) {
    if (newValue !== this.rawValue) {
      this._value = toReactive(newValue);
      this.rawValue = newValue;
      triggerEffects(this.dep);
    }
  }
};
function ref(value) {
  return new RefImpl(value);
}
var ObjectRefImpl = class {
  constructor(_target, _key) {
    this._target = _target;
    this._key = _key;
    this.__v_isRef = true;
  }
  get value() {
    if (activeEffect) {
      trackEffects(this.dep || (this.dep = /* @__PURE__ */ new Set()));
    }
    this._value = this._target[this._key];
    return this._value;
  }
  set value(newValue) {
    if (newValue !== this._value) {
      this._target[this._key] = newValue;
      this._value = this._target[this._key];
      triggerEffects(this.dep);
    }
  }
};
function toRef(target, key) {
  return new ObjectRefImpl(target, key);
}
function toRefs(target) {
  const res = {};
  for (let key in target) {
    res[key] = toRef(target, key);
  }
  return res;
}
function proxyRefs(objectWithRefs) {
  return new Proxy(objectWithRefs, {
    get(target, key, receiver) {
      const v = Reflect.get(target, key, receiver);
      return v.__v_isRef ? v.value : v;
    },
    set(target, key, value, receiver) {
      const oldValue = target[key];
      if (!oldValue.__v_isRef) {
        return Reflect.set(target, key, value, receiver);
      }
      oldValue.value = value;
      return true;
    }
  });
}

// packages/reactivity/src/baseHandlers.ts
var baseHandlers = {
  get(target, key, receiver) {
    if (key === "__v_isReactive" /* IS_REACTIVE */) {
      return true;
    }
    track(target, key);
    let res = Reflect.get(target, key, receiver);
    if (isRef(res)) {
      return res.value;
    }
    if (isObject(res)) {
      return reactive(res);
    }
    return res;
  },
  set(target, key, value, receiver) {
    let oldValue = target[key];
    let res = Reflect.set(target, key, value, receiver);
    if (oldValue !== value) {
      trigger(target, key, value, oldValue);
    }
    return res;
  }
};

// packages/reactivity/src/reactive.ts
var ReactiveFlags = /* @__PURE__ */ ((ReactiveFlags2) => {
  ReactiveFlags2["IS_REACTIVE"] = "__v_isReactive";
  return ReactiveFlags2;
})(ReactiveFlags || {});
function isReactive(value) {
  return !!(value && value["__v_isReactive" /* IS_REACTIVE */]);
}
var proxyMap = /* @__PURE__ */ new WeakMap();
function reactive(target) {
  if (!isObject(target)) {
    return target;
  }
  if (target["__v_isReactive" /* IS_REACTIVE */]) {
    return target;
  }
  const existingProxy = proxyMap.get(target);
  if (existingProxy) {
    return existingProxy;
  }
  const proxy = new Proxy(target, baseHandlers);
  proxyMap.set(target, proxy);
  return proxy;
}

// packages/reactivity/src/computed.ts
var noop = () => {
};
var ComputedRefImp = class {
  // 缓存值
  constructor(getter, setter) {
    this.setter = setter;
    this.dep = null;
    // 计算属性收集的effects依赖集合
    this.effect = null;
    // getter 的封装
    this.__v_isRef = true;
    this._dirty = true;
    // 控制是否需要重新执行：第一次取后，只要依赖没变后面都直接取缓存，不需要重新执行；依赖变后才要重新执行。 初始为true 表示需要执行
    this._value = void 0;
    this.effect = new ReactieEffect(getter, () => {
      this._dirty = true;
      triggerEffects(this.dep);
    });
  }
  get value() {
    if (activeEffect) {
      trackEffects(this.dep || (this.dep = /* @__PURE__ */ new Set()));
    }
    if (this._dirty) {
      this._value = this.effect.run();
      this._dirty = false;
    }
    return this._value;
  }
  set value(newValue) {
    this.setter(newValue);
  }
};
function computed(getterOrOptions) {
  const onlyGetter = isFunction(getterOrOptions);
  let getter;
  let setter;
  if (onlyGetter) {
    getter = getterOrOptions;
    setter = noop;
  } else {
    getter = getterOrOptions.get;
    setter = getterOrOptions.set || noop;
  }
  return new ComputedRefImp(getter, setter);
}

// packages/reactivity/src/watch.ts
function traverse(source, visited = /* @__PURE__ */ new Set()) {
  if (!isObject(source)) {
    return source;
  }
  if (visited.has(source)) {
    return source;
  }
  visited.add(source);
  for (let key in source) {
    traverse(source[key], visited);
  }
  return source;
}
function doWatch(source, cb, opts) {
  let oldValue;
  let getter;
  if (isReactive(source)) {
    getter = () => traverse(source);
  } else if (isFunction(source)) {
    getter = source;
  }
  const job = () => {
    if (cb) {
      const newVal = effect2.run();
      cb(newVal, oldValue);
      oldValue = newVal;
    } else {
      effect2.run();
    }
  };
  const effect2 = new ReactieEffect(getter, job);
  if (opts.immediate) {
    job();
  }
  oldValue = effect2.run();
}
function watch(source, cb, options = {}) {
  doWatch(source, cb, options);
}
function watchEffect(effect2, options = {}) {
  doWatch(effect2, null, options);
}

// packages/runtime-core/src/componentProps.ts
function initProps(instance, rawProps) {
  const props = {};
  const attrs = {};
  const propsOptions = instance.propsOptions || {};
  if (rawProps) {
    for (const key in rawProps) {
      if (key in propsOptions) {
        props[key] = rawProps[key];
      } else {
        attrs[key] = rawProps[key];
      }
    }
  }
  instance.props = reactive(props);
  instance.attrs = attrs;
}
function updateProps(instance, nextRawProps) {
  const { props: instanceProps, propsOptions, attrs } = instance;
  for (const key in nextRawProps) {
    if (key in propsOptions) {
      instanceProps[key] = nextRawProps[key];
    } else {
      attrs[key] = nextRawProps[key];
    }
  }
  for (const key in instanceProps) {
    if (!(key in nextRawProps)) {
      delete instanceProps[key];
    }
  }
}
function hasPropsChanged(prevProps, nextProps) {
  const l1 = Object.keys(prevProps);
  const l2 = Object.keys(nextProps);
  if (l1.length !== l2.length) {
    return true;
  }
  for (let i = 0; i < l1.length; i++) {
    const key = l2[i];
    if (prevProps[key] !== nextProps[key]) {
      return true;
    }
  }
  return false;
}

// packages/runtime-core/src/slots.ts
function initSlots(instance, children) {
  if (children) {
    if (instance.vnode.shapeFlag & 32 /* SLOTS_CHILDREN */) {
      instance.slots = children;
    }
  }
}
function updateSlots(instance, nextSlots) {
  if (nextSlots) {
    Object.assign(instance.slots, nextSlots);
  }
}

// packages/runtime-core/src/component.ts
function createComponentInstane(vnode, parent2) {
  const instance = {
    data: null,
    isMounted: false,
    // 标识组件是否是初次挂载
    vnode,
    // 组件 vnode
    subTree: null,
    // 组件实际渲染的是其封装的 UI 结构， subTree 就是对应封装的 UI 结构的虚拟节点
    update: null,
    // 组件更新的函数
    props: {},
    // 组件声明使用的 props 属性
    attrs: {},
    // 组件未声明的属性
    propsOptions: vnode.type.props || {},
    // 组件声明的 props 选项，根据这个和所有的 props，设置 props和attrs
    proxy: null,
    // 组件实例的代理， this 指向整合，可以访问到 data 也可以 props
    slots: null,
    // 组件插槽
    steupState: null,
    // 组件 setup 函数返回的响应式状态数据
    exposed: null,
    // ref 模板引用时，获取组件实例暴露处的内容
    parent: parent2,
    // 记录父组件实例
    provides: parent2 ? parent2.provides : /* @__PURE__ */ Object.create(null),
    // 记录父组件提供的内容
    ctx: {},
    // 只对于 keep-alive 内置组件有作用
    // 组件生命周期
    bm: null,
    m: null,
    bu: null,
    u: null,
    bum: null,
    um: null
  };
  return instance;
}
var publicProperties = {
  $attrs: (target) => target.attrs,
  $props: (target) => target.props,
  $slots: (target) => target.slots
};
var PublicInstanceProxyHandlers = {
  // 对组件实例代理，实现 this.xxxKey 访问到 data 和 props
  get(target, key) {
    let { props, data, setupState } = target;
    if (data && hasOwn(key, data)) {
      return data[key];
    } else if (hasOwn(key, props)) {
      return props[key];
    } else if (setupState && hasOwn(key, setupState)) {
      return setupState[key];
    }
    let getter = publicProperties[key];
    if (getter) {
      return getter(target);
    }
  },
  set(target, key, value) {
    let { props, data, setupState } = target;
    if (data && hasOwn(key, data)) {
      data[key] = value;
    } else if (hasOwn(key, props)) {
      props[key] = value;
    } else if (setupState && hasOwn(key, setupState)) {
      setupState[key] = value;
    }
    return true;
  }
};
var currentInstance;
function setCurrentInstance(instance) {
  currentInstance = instance;
}
function getCurrentInstance() {
  return currentInstance;
}
function setupComponent(instance) {
  const { type, props, children } = instance.vnode;
  initProps(instance, props);
  initSlots(instance, children);
  instance.proxy = new Proxy(instance, PublicInstanceProxyHandlers);
  const { setup } = type;
  if (setup) {
    const setupContext = {
      attrs: instance.attrs,
      emit: (event, ...agrs) => {
        const eventName = `on${event[0].toUpperCase() + event.slice(1)}`;
        const handler = instance.attrs[eventName];
        handler && handler(...agrs);
      },
      expose(exposed) {
        instance.exposed = exposed;
      },
      slots: instance.slots
    };
    setCurrentInstance(instance);
    const setupRes = setup(instance.props, setupContext);
    setCurrentInstance(null);
    if (isFunction(setupRes)) {
      instance.render = setupRes;
    } else {
      instance.setupState = proxyRefs(setupRes);
    }
  }
  if (!instance.render) {
    instance.render = type.render;
  }
  let data = type.data;
  if (data) {
    if (isFunction(data)) {
      instance.data = reactive(data.call(instance.proxy));
    }
  }
}
function shouldUpdateComponent(n1, n2) {
  const { props: prevProps, children: preChildren } = n1;
  const { props: nextProps, children: nextChildren } = n2;
  if (preChildren || nextChildren)
    return true;
  if (prevProps === nextProps)
    return false;
  return hasPropsChanged(prevProps, nextProps);
}

// packages/runtime-core/src/vnode.ts
var Text = Symbol("text");
var Fragment = Symbol("fragment");
function isVNode(vnode) {
  return vnode.__v_isVnode === true;
}
function isSameVNodeType(n1, n2) {
  return n1.type === n2.type && n1.key === n2.key;
}
function createVNode(type, props, children) {
  const shapeFlag = isString(type) ? 1 /* ELEMENT */ : isObject(type) ? 6 /* COMPONENT */ : 0;
  const vnode = {
    __v_isVnode: true,
    type,
    props,
    children,
    shapeFlag,
    key: props?.key,
    el: null,
    component: null
    // 组件的话才会赋值，否则就是 null
  };
  if (children) {
    const type2 = isString(children) ? 8 /* TEXT_CHILDREN */ : isObject(children) ? 32 /* SLOTS_CHILDREN */ : 16 /* ARRAY_CHILDREN */;
    vnode.shapeFlag |= type2;
  }
  return vnode;
}

// packages/runtime-core/src/apiLifeCycle.ts
var LifeCycleHooks = /* @__PURE__ */ ((LifeCycleHooks2) => {
  LifeCycleHooks2["BEFORE_CREATE"] = "bc";
  LifeCycleHooks2["CREATED"] = "c";
  LifeCycleHooks2["BEFORE_MOUNT"] = "bm";
  LifeCycleHooks2["MOUNTED"] = "m";
  LifeCycleHooks2["BEFORE_UPDATE"] = "bu";
  LifeCycleHooks2["UPDATED"] = "u";
  LifeCycleHooks2["BEFORE_UNMOUNT"] = "bum";
  LifeCycleHooks2["UNMOUNTED"] = "um";
  LifeCycleHooks2["DEACTIVATED"] = "da";
  LifeCycleHooks2["ACTIVATED"] = "a";
  return LifeCycleHooks2;
})(LifeCycleHooks || {});
function createHook(type) {
  return (hook, target = currentInstance) => {
    if (target) {
      const hooks = target[type] || (target[type] = []);
      const wrapperHook = () => {
        setCurrentInstance(target);
        hook();
        setCurrentInstance(null);
      };
      hooks.push(wrapperHook);
    }
  };
}
var onBeforeMount = createHook("bm" /* BEFORE_MOUNT */);
var onMounted = createHook("m" /* MOUNTED */);
var onBeforeUpdate = createHook("bu" /* BEFORE_UPDATE */);
var onUpdated = createHook("u" /* UPDATED */);
var onBeforeUnmount = createHook("bum" /* BEFORE_UNMOUNT */);
var onUnmounted = createHook("um" /* UNMOUNTED */);

// packages/runtime-core/src/KeepAlive.ts
var KeepAliveCopmImpl = {
  name: "keep-alive",
  __isKeepAlive: true,
  props: {
    includes: String,
    excludes: String,
    max: Number
  },
  setup(props, { slots }) {
    let pendingKey;
    const keys = /* @__PURE__ */ new Set();
    const cache = /* @__PURE__ */ new Map();
    const instance = getCurrentInstance();
    let { move, createElement: createElement2 } = instance.ctx.renderer;
    const cacheSubTree = () => {
      if (pendingKey) {
        cache.set(pendingKey, instance.subTree);
      }
    };
    const storageContainer = createElement2("div");
    onMounted(cacheSubTree);
    onUpdated(cacheSubTree);
    instance.ctx.activate = function(vnode, container) {
      console.log(vnode.type.name, "activate");
      move(vnode, container);
    };
    instance.ctx.deActivate = function(vnode) {
      console.log(vnode.type.name, "deActivate");
      move(vnode, storageContainer);
      vnode.shapeFlag |= 512 /* COMPONENT_KEPT_ALIVE */;
    };
    const purneCacheEntry = (key) => {
      const cached = cache.get(key);
      cache.delete(key);
      keys.delete(key);
      _unmount(cached);
    };
    const _unmount = (vnode) => {
      let { shapeFlag } = vnode;
      if (shapeFlag & 512 /* COMPONENT_KEPT_ALIVE */) {
        shapeFlag -= 512 /* COMPONENT_KEPT_ALIVE */;
      }
      if (shapeFlag & 256 /* COMPONENT_SHOULD_KEEP_ALIVE */) {
        shapeFlag -= 256 /* COMPONENT_SHOULD_KEEP_ALIVE */;
      }
      vnode.shapeFlag = shapeFlag;
      instance.ctx.renderer.unmount(vnode);
    };
    const render2 = () => {
      const vnode = slots.default();
      if (!isVNode(vnode) || !(vnode.shapeFlag & 4 /* STATEFUL_COMPONENT */)) {
        return vnode;
      }
      const { includes, excludes, max } = props;
      const name = vnode.type.name;
      if (includes && !includes.split(",").includes(name) || excludes && excludes.split(",").includes(name)) {
        return vnode;
      }
      const compObj = vnode.type;
      const key = pendingKey = vnode?.props?.key == null ? compObj : vnode?.props?.key;
      const hasCached = cache.has(key);
      if (!hasCached) {
        if (max && keys.size >= max) {
          purneCacheEntry(keys.values().next().value);
        }
        keys.add(key);
      } else {
        const cacheVnode = cache.get(key);
        vnode.component = cacheVnode.component;
        vnode.shapeFlag |= 512 /* COMPONENT_KEPT_ALIVE */;
      }
      vnode.shapeFlag |= 256 /* COMPONENT_SHOULD_KEEP_ALIVE */;
      return vnode;
    };
    return render2;
  }
};
var isKeepAlive = (vnode) => vnode.type.__isKeepAlive;

// packages/runtime-core/src/scheduler.ts
var queue = /* @__PURE__ */ new Set();
var isFlushing = false;
var resolvePromise = Promise.resolve();
var queueJob = (job) => {
  if (!queue.has(job)) {
    queue.add(job);
  }
  if (!isFlushing) {
    isFlushing = true;
    resolvePromise.then(() => {
      isFlushing = false;
      let copy = new Set(queue);
      queue.clear();
      for (let job2 of copy) {
        job2();
      }
    });
  }
};

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
  const mountChildren = (children, el, parent2) => {
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      patch(null, child, el, null, parent2);
    }
  };
  const unmountChildren = (children) => {
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      unmount(child, parent);
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
        unmount(c1[i], parent);
        i++;
      }
    } else {
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
          unmount(oldChild, parent);
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
        mountChildren(c2, container, parent);
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
  const mountElement = (vnode, container, anchor, parent2) => {
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
      mountChildren(children, el, parent2);
    }
    hostInsert(el, container, anchor);
  };
  const processElement = (n1, n2, container, anchor, parent2) => {
    if (n1 === null) {
      mountElement(n2, container, anchor, parent2);
    } else {
      patchElement(n1, n2);
    }
  };
  const processText = (n1, n2, container) => {
    let el;
    if (n1 == null) {
      el = n2.el = hostCreateText(n2.children);
      hostInsert(el, container);
    } else {
      el = n2.el = n1.el;
      if (n1.children !== n2.children) {
        hostSetText(el, n2.children);
      }
    }
  };
  const processFragment = (n1, n2, container, parent2) => {
    if (n1 == null) {
      mountChildren(n2.children, container, parent2);
    } else {
      patchKeyedChildren(n1.children, n2.children, container);
    }
  };
  const updateComponentPreRender = (instance, nextVNode) => {
    instance.nextVNode = null;
    instance.vnode = nextVNode;
    updateProps(instance, nextVNode.props);
    updateSlots(instance, nextVNode.children);
  };
  const unmountComponent = (subTree, parent2) => {
    return unmount(subTree, parent2);
  };
  const setupRenderEffect = (instance, container, anchor) => {
    let render3 = instance.render;
    const componentFn = () => {
      if (!instance.isMounted) {
        const { bm, m } = instance;
        if (bm) {
          invokeArrayFns(bm);
        }
        const subTree = render3.call(instance.proxy, instance.proxy);
        patch(null, subTree, container, anchor, instance);
        instance.subTree = subTree;
        instance.isMounted = true;
        if (m) {
          invokeArrayFns(m);
        }
      } else {
        const { nextVNode } = instance;
        if (nextVNode) {
          updateComponentPreRender(instance, nextVNode);
        }
        const { bu, u } = instance;
        if (bu) {
          invokeArrayFns(bu);
        }
        const subTree = render3.call(instance.proxy, instance.proxy);
        patch(instance.subTree, subTree, container, anchor, instance);
        instance.subTree = subTree;
        if (u) {
          invokeArrayFns(u);
        }
      }
    };
    const effect2 = new ReactieEffect(componentFn, () => {
      queueJob(update);
    });
    const update = instance.update = effect2.run.bind(effect2);
    update();
  };
  const updateComponent = (n1, n2) => {
    const instance = n2.component = n1.component;
    if (shouldUpdateComponent(n1, n2)) {
      instance.nextVNode = n2;
      instance.update();
    }
  };
  const mountComponent = (vnode, container, anchor, parent2) => {
    const instance = vnode.component = createComponentInstane(vnode, parent2);
    if (isKeepAlive(vnode)) {
      ;
      instance.ctx.renderer = {
        createElement: hostCreateElement,
        move(vnode2, container2) {
          hostInsert(vnode2.component.subTree.el, container2);
        },
        unmount
      };
    }
    setupComponent(instance);
    setupRenderEffect(instance, container, anchor);
  };
  const processComponent = (n1, n2, container, anchor, parent2) => {
    if (n1 === null) {
      if (n2.shapeFlag & 512 /* COMPONENT_KEPT_ALIVE */) {
        return parent2.ctx.activate(n2, container, anchor);
      }
      mountComponent(n2, container, anchor, parent2);
    } else {
      updateComponent(n1, n2);
    }
  };
  const patch = (n1, n2, container, anchor = null, parent2 = null) => {
    if (n1 === n2)
      return;
    if (n1 && !isSameVNodeType(n1, n2)) {
      unmount(n1, parent2);
      n1 = null;
    }
    const { type, shapeFlag } = n2;
    switch (type) {
      case Text:
        processText(n1, n2, container);
        break;
      case Fragment:
        processFragment(n1, n2, container, parent2);
        break;
      default:
        if (shapeFlag & 1 /* ELEMENT */) {
          processElement(n1, n2, container, anchor, parent2);
        } else if (shapeFlag & 6 /* COMPONENT */) {
          processComponent(n1, n2, container, anchor, parent2);
        }
    }
  };
  const unmount = (vnode, parent2) => {
    const { shapeFlag } = vnode;
    if (shapeFlag & 256 /* COMPONENT_SHOULD_KEEP_ALIVE */) {
      parent2.ctx.deActivate(vnode);
      return;
    }
    if (vnode.type === Fragment) {
      return unmountChildren(vnode.children);
    } else if (shapeFlag & 6 /* COMPONENT */) {
      return unmountComponent(vnode.component.subTree, parent2);
    }
    hostRemove(vnode.el);
  };
  const render2 = (vnode, container, parent2 = null) => {
    if (vnode === null) {
      if (container._vnode) {
        unmount(container._vnode, parent2);
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
var insert = (child, parent2, anchor) => {
  parent2.insertBefore(child, anchor || null);
};
var remove = (child) => {
  const parent2 = child.parentNode;
  if (parent2) {
    parent2.removeChild(child);
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

// packages/runtime-core/src/apiProvide.ts
function provide(key, value) {
  if (currentInstance) {
    let provides = currentInstance.provides;
    const parentProvides = currentInstance.parent && currentInstance.parent.provides;
    if (provides === parentProvides) {
      provides = currentInstance.provides = Object.create(provides);
    }
    provides[key] = value;
  }
}
function inject(key, defaultValue) {
  if (currentInstance) {
    const provides = currentInstance.parent?.provides;
    if (provides && key in provides) {
      return provides[key];
    } else if (defaultValue) {
      return defaultValue;
    }
  }
}

// packages/runtime-dom/src/index.ts
var renderOptions = Object.assign(nodeOps, { patchProp });
var render = (vnode, container) => {
  return createRenderer(renderOptions).render(vnode, container);
};
export {
  Fragment,
  KeepAliveCopmImpl as KeepAlive,
  LifeCycleHooks,
  ReactieEffect,
  ReactiveFlags,
  Text,
  activeEffect,
  activeEffectScope,
  computed,
  createComponentInstane,
  createRenderer,
  createVNode,
  currentInstance,
  effect,
  effectScope,
  getCurrentInstance,
  h,
  initSlots,
  inject,
  isReactive,
  isRef,
  isSameVNodeType,
  isVNode,
  onBeforeMount,
  onBeforeUnmount,
  onBeforeUpdate,
  onMounted,
  onUnmounted,
  onUpdated,
  provide,
  proxyRefs,
  reactive,
  recordEffectScope,
  ref,
  render,
  setCurrentInstance,
  setupComponent,
  shouldUpdateComponent,
  toRef,
  toRefs,
  track,
  trackEffects,
  trigger,
  triggerEffects,
  updateSlots,
  watch,
  watchEffect
};
//# sourceMappingURL=runtime-dom.esm.js.map

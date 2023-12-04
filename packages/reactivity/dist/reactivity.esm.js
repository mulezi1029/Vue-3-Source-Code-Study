// packages/shared/src/index.ts
function isObject(obj) {
  return obj !== null && typeof obj === "object";
}
function isFunction(value) {
  return typeof value === "function";
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

// packages/reactivity/src/baseHandlers.ts
var baseHandlers = {
  get(target, key, receiver) {
    if (key === "__v_isReactive" /* IS_REACTIVE */) {
      return true;
    }
    track(target, key);
    let res = Reflect.get(target, key, receiver);
    if (isObject(res)) {
      res = reactive(res);
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
    this.effect = null;
    this.__v_isRef = true;
    this._dirty = true;
    // 控制是否需要重新执行：第一次取后，只要依赖没变后面都直接取缓存，不需要重新执行；依赖变后才要重新执行。 初始为true 表示需要执行
    this._value = void 0;
    this.effect = new ReactieEffect(getter, () => {
      this._dirty = true;
    });
  }
  get value() {
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
export {
  ReactieEffect,
  ReactiveFlags,
  activeEffect,
  computed,
  effect,
  reactive,
  track,
  trigger
};
//# sourceMappingURL=reactivity.esm.js.map

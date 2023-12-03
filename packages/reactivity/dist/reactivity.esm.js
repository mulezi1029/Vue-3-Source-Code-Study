// packages/shared/src/index.ts
function isObject(obj) {
  return obj !== null && typeof obj === "object";
}

// packages/reactivity/src/effect.ts
var activeEffect;
var ReactieEffect = class {
  constructor(fn) {
    this.fn = fn;
    // 控制这个函数是否需要响应性的开关标志
    this.active = true;
    this.parent = null;
    this.deps = [];
  }
  // 记录该响应性函数依赖的响应性属性的集合
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
};
function effect(fn) {
  const _effect = new ReactieEffect(fn);
  _effect.run();
}
var targetMap = /* @__PURE__ */ new WeakMap();
function cleanupEffect(effect2) {
  const { deps } = effect2;
  for (const dep of deps) {
    dep.delete(effect2);
  }
  activeEffect.deps.length = 0;
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
        effect2.run();
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
    return Reflect.get(target, key, receiver);
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
export {
  ReactiveFlags,
  activeEffect,
  effect,
  reactive,
  track,
  trigger
};
//# sourceMappingURL=reactivity.esm.js.map

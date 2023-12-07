export let activeEffectScope

class EffectScope {
	active = true
	effects = new Set<any>()
	parent = null
	constructor() {}
	run(fn) {
		if (this.active) {
			try {
				this.parent = activeEffectScope
				activeEffectScope = this
				return fn()
			} finally {
				activeEffectScope = this.parent
				this.parent = null
			}
		}
	}
	stop() {
		if (this.active) {
			for (const effect of this.effects) {
				effect.stop()
			}
			this.active = false
		}
	}
}

export function recordEffectScope(effct) {
	if (activeEffectScope && activeEffectScope.active) {
		activeEffectScope.effects.add(effct)
	}
}

export function effectScope() {
	return new EffectScope()
}

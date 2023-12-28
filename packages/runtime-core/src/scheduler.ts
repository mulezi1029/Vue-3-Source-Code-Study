const queue = new Set<() => void>()
let isFlushing = false
const resolvePromise = Promise.resolve()
export const queueJob = (job) => {
	if (!queue.has(job)) {
		queue.add(job)
	}
	if (!isFlushing) {
		isFlushing = true
		resolvePromise.then(() => {
			// 微任务
			isFlushing = false
			let copy = new Set<() => void>(queue)
			queue.clear() // 清空队列
			for (let job of copy) {
				job()
			}
		})
	}
}

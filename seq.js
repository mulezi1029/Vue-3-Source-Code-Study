function getSequence(arr) {
	let res = [0]
	let len = arr.length
	let p = arr.slice(0)
	for (let i = 1; i < len; i++) {
		let arrI = arr[i]
		let lastInd
		if (arrI !== 0) {
			lastInd = res[res.length - 1]
			if (arr[lastInd] < arrI) {
				res.push(i)
				p[i] = lastInd // 当前最后一项记住前一项索引
			} else {
				let start = 0
				let end = res.length - 1
				let ans
				while (start <= end) {
					let mid = Math.floor((start + end) / 2)
					if (arr[res[mid]] < arrI) {
						start = mid + 1
					} else {
						ans = mid
						end = mid - 1
					}
				}
				p[i] = res[ans - 1]
				res[ans] = i
			}
		}
	}
	// 修正
	for (let i = res.length - 1; i > 0; i--) {
		// debugger
		res[i - 1] = p[res[i]]
	}
	return res
}

console.log(getSequence([2, 3, 1, 5, 6, 8, 7, 9, 4]))
console.log(getSequence([2, 5, 8, 4, 6, 7, 9, 3]))

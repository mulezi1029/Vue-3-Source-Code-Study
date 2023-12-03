const arr = [1]
arr.forEach((item, index, ary) => {
	ary.pop()
	ary.push(item)
})

const set = new Set(arr)
set.forEach((item) => {
	set.delete(item)
	set.add(item)
})

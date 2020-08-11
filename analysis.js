const stemmer = require('porter-stemmer').stemmer
const stopwords_en = require('./stopwords/en.json')
const stopwords_zh = require('./stopwords/zh.json')

function split(str) {
	let words = str.split(/[^a-z0-9\-']+/i).filter(s=>s).map(s=>stemmer(s.toLowerCase()))
	const chineseGroups = str.match(/[\u3040-\u9FFF]+/gu)
	let chinese = [].concat.apply([], chineseGroups||[]).join('').split('')
	words = words.filter(w => !stopwords_en[w])
	chinese = chinese.filter(z => !stopwords_zh[z])
	return words.concat(chinese)
}

module.exports = function analysis (value) {
	if (Array.isArray(value)) {
		return value.map(split).flat()
	} else {
		return split(value)
	}
}

// console.log(analysis(
// 	[
// 		"三角形",
// 		"倒三triangle shape is good角",
// 		"向下",
// 		"红色",
// 		"红色倒三角"
// 	]))

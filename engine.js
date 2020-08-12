function Engine(db, _options={}) {
	let options = {
		idField: 'id',
		getD: ()=>10000,
		analysis,
		fields: {}
	}
	options = Object.assign(options, _options)
	// console.log(options)

	async function get(key, _default=[]) {
		try {
			return await db.get(key)
		} catch (error) {
			return _default
		}
	}

	function analysis(value) {
		if (Array.isArray(value)) {
			return value
		} else {
			return value.split(' ')
		}
	}

	async function put(obj) {
		const id = obj[options.idField]
		let index = {}
		for (const field in obj) {
			const fieldMode = options.fields[field] || '@'
			if (fieldMode.includes('!')) continue

			if (fieldMode.includes('#')) {
				const values = Array.isArray(obj[field]) ? obj[field] : [obj[field]]
				for (const value of values) {
					if (!value.match(/[A-Za-z0-9_\-]+/) && value.length==1) continue
					const key = field+':'+value
					if (!index[key]) index[key] = {[id]: 1}
				}
			}

			if (fieldMode.includes('@')) {
				const values = options.analysis(obj[field])
				for (const value of values) {
					const key = field+':'+value
					if (!index[key]) index[key] = {[id]: 0}
					index[key][id] += +(1/values.length).toFixed(2)
				}
			}
		}
		// console.log(index)
		for (const key in index) {
			let target = await get(key, {})
			Object.assign(target, index[key])
			// console.log(target)
			await db.put(key, target)
		}
		return index
	}

	function calculateScore (x, _, results) {
		const D = options.getD()
		const idf = Math.log((D + 1) / results.length)
		const matches = [].concat.apply([], Object.values(x.matches))
        x.score = +matches.reduce(
            (acc, cur) => acc + idf * +cur.percent, 0
        ).toFixed(2)
        return x
	}
	
	async function union(keys, groupBy='keyword') {
		const results = await Promise.all(keys.map(key => get(key)))
		// console.log(results)
		const acc = {}
		for (let i = 0; i < keys.length; i++) {
			const [field, keyword] = keys[i].split(':')
			for (const id in results[i]) {
				const percent = results[i][id]
				const match = {field, keyword, percent}
				const group = match[groupBy]
				if (!acc[id]) acc[id] = {id, matches:{}}
				if (!acc[id].matches[group]) acc[id].matches[group] = []
				acc[id].matches[group].push(match)
			}
		}
		// console.log(acc)
		return Object.values(acc)
	}

	async function search(_keywords, fields) {
		const keywords = [...new Set(options.analysis(_keywords))]

		const keys = []
		const tagKeys = []
		for (const keyword of keywords) {
			for (const field of fields) {
				if (!options.fields[field] || options.fields[field].includes('@')) {
					keys.push(field+':'+keyword)
				}
			}
		}
		for (const field of fields) {
			if (options.fields[field] && options.fields[field].includes('#')) {
				tagKeys.push(field+':'+_keywords)
			}
		}
		// console.log(keys.concat(tagKeys))
		let results = await union(keys.concat(tagKeys))
		results = results.filter(x => Object.keys(x.matches).length>=keywords.length*0.6)
		// let tagResults = await union(tagKeys)
		// results = tagResults.concat(results)
		
		const sorted = results
			.map(calculateScore)
			.sort((a, b) => b.score - a.score)
		// console.log(acc)
		return sorted
	}

	return {get, put, search, union}
}

module.exports = Engine


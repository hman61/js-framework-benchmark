'use strict'
import {Timer, adjectives, colours, nouns} from '../lib/timer/Timer.js'
import { createTemplate,  appendWithProvider, renderWithProvider, version} from '../lib/doohtml.js'
// TODO: verify this is the fastest way to get random integers in single benchmark test suite



const _random = max => Math.trunc(Math.random() * max)

// const adjectives = ["pretty", "large", "big", "small", "tall", "short", "long", "handsome", "plain", "quaint", "clean", "elegant", "easy", "angry", "crazy", "helpful", "mushy", "odd", "unsightly", "adorable", "important", "inexpensive", "cheap", "expensive", "fancy"]
// const colours = ["red", "yellow", "blue", "green", "pink", "brown", "purple", "brown", "white", "black", "orange"]
// const nouns = ["table", "chair", "house", "bbq", "desk", "car", "pony", "cookie", "sandwich", "burger", "pizza", "mouse", "keyboard"]

const lenA = adjectives.length, lenB = colours.length, lenC = nouns.length

const DEFAULT_SIZE = 1000, DEFAULT_SIZE_RUN_LOTS = 10000, SWAP_ROW = 998, BANG = ' !!!', DANGER = 'danger', TR = 'tr'

let rows = [], ID = 1, selectedRow, tbody = null 


const buildRow = (index, rows) => {
	// TODO: test in single benchmark test suite
	const label = `${adjectives[_random(lenA)]} ${colours[_random(lenB)]} ${nouns[_random(lenC)]}`
	const id = ID++
	const row = { id, label }
	rows.push(row)
	return row
}

// const buildData = (count = DEFAULT_SIZE) => {
// 	// TODO: test in single benchmark test suite
// 	const data = Array.from({length: count})
// 	for (let i = 0; i < count; i = i + 1) {
// 		const label = `${adjectives[_random(lenA)]} ${colours[_random(lenB)]} ${nouns[_random(lenC)]}`
// 		const id = ID++
// 		data[i] = { id, label }
// 	}
// 	return data	
// }

const getIndex = (key) => {
	for (let i = 0; i < rows.length; i = i + 1) {
		if (rows[i].id === key) {
			return i
		}
	}
	return -1
}

const deleteRow = (elem) => {
	const row = elem.closest(TR)
	if (row) {
		const key = row.key 
		const idx = getIndex(key)
		if (key  && idx > -1) {
			rows.splice(idx, 1)
			row.remove()
		}
	}
}

const run = () => {
	if (rows.length > 0) clear()
	renderWithProvider(tbody, buildRow, 0, DEFAULT_SIZE, rows)
}

const add = () => {
	let start = rows.length
	appendWithProvider(tbody, buildRow, start, DEFAULT_SIZE, rows)
}

const runLots = () => {
	Timer.start('tot', version)
	if (rows.length > 0) clear()
	renderWithProvider(tbody, buildRow, 0, DEFAULT_SIZE_RUN_LOTS, rows)
	Timer.stop('tot')
}

const update = () => {
	for (let i = 0, len = rows.length; i < len; i += 10) {
		tbody.childNodes[i].childNodes[1].childNodes[0].lastChild.nodeValue  = rows[i].label = `${rows[i].label}${BANG}`
	}
}

const select = (elem) => {
	if (selectedRow) {
		selectedRow.className = ''
		selectedRow = undefined
	}
	
	if (elem) {
		const row = elem.closest(TR)
		if (row) {
			selectedRow = row
			row.className = DANGER
		}
	}	
}

const clear = () => {
	selectedRow = undefined
	tbody.textContent = null
	rows = []	
}

const swapRows = () => {
	if (rows.length > SWAP_ROW) {
		let node1 = tbody.firstChild.nextSibling, 
			swapRow = tbody.children[SWAP_ROW],
			node999 = swapRow.nextSibling,
			row1 = rows[1]
		
		rows[1] = rows[SWAP_ROW]
		rows[SWAP_ROW] = row1
		
		tbody.insertBefore(node1.parentNode.replaceChild(swapRow, node1), node999)
	}
}

const init = async () => {
	tbody = await createTemplate('table', rows)
	tbody.addEventListener('click', e => {
		e.preventDefault()
		if (e.target.parentElement.matches('.remove')) {
			deleteRow(e.target.parentElement)
		} else if (e.target.tagName === 'A') {
			select(e.target)
		}
	})
}
const addEventListeners = () => {
	const actions = {
		'run': run,
		'runlots': runLots,
		'add': add,
		'update': update,
		'clear': clear,
		'swaprows': swapRows,
		runAction: (e) => {
			e.preventDefault()
			if (actions[e.target.id]) {
				actions[e.target.id]()
			}	
		}
	}	
	// eslint-disable-next-line unicorn/prefer-query-selector
	globalThis.document.getElementById("main").addEventListener('click', e => actions.runAction(e))    
}

// Expose Timer to window for testing
if (typeof globalThis.window !== 'undefined') {
	globalThis.window.Timer = Timer
} else if (typeof globalThis !== 'undefined') {
	globalThis.Timer = Timer
}

globalThis.document.querySelector(".ver").innerHTML += `${version} (keyed)`
globalThis.document.title += ` (keyed)`
addEventListeners()
init()

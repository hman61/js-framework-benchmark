'use strict'

import {createTemplate, appendWithProvider, renderWithProvider, version} from '../node_modules/doohtml/dist/doohtml.mjs'
const adjectives = ["pretty", "large", "big", "small", "tall", "short", "long", "handsome", "plain", "quaint", "clean", "elegant", "easy", "angry", "crazy", "helpful", "mushy", "odd", "unsightly", "adorable", "important", "inexpensive", "cheap", "expensive", "fancy"]
const colours = ["red", "yellow", "blue", "green", "pink", "brown", "purple", "brown", "white", "black", "orange"]
const nouns = ["table", "chair", "house", "bbq", "desk", "car", "pony", "cookie", "sandwich", "burger", "pizza", "mouse", "keyboard"]

const lenA = adjectives.length, lenB = colours.length, lenC = nouns.length

const DEFAULT_SIZE = 1000, DEFAULT_SIZE_RUN_LOTS = 10000, SWAP_ROW = 998, BANG = ' !!!', DANGER = 'danger', TR = 'tr'

// Global ID counter - persists across renders and clear operations, only resets on page reload
if (globalThis.ID === undefined) {
	globalThis.ID = 1
}

// Optimized Store class with Map for O(1) lookups
class Store {
	constructor() {
		this.rows = []
		this.rowsMap = new Map()  // For O(1) lookup by id
		this.selectedRow = null
	}

	create() {
		const id = globalThis.ID++
		const adjIdx = Math.trunc(Math.random() * lenA) % lenA
		const colIdx = Math.trunc(Math.random() * lenB) % lenB
		const nounIdx = Math.trunc(Math.random() * lenC) % lenC
		
		const label = `${adjectives[adjIdx]} ${colours[colIdx]} ${nouns[nounIdx]}`
		
		const row = { id, label }
		this.rows.push(row)
		this.rowsMap.set(id, row)
		return row
	}

	getIndex(key) {
		const row = this.rowsMap.get(key)
		return row ? this.rows.indexOf(row) : -1
	}

	delete(key) {
		const row = this.rowsMap.get(key)
		if (!row) return false
		
		const idx = this.rows.indexOf(row)
		if (idx !== -1) {
			this.rows.splice(idx, 1)
			this.rowsMap.delete(key)
			return true
		}
		return false
	}

	clear() {
		this.rows = []
		this.rowsMap.clear()
		this.selectedRow = null
	}
}

const store = new Store()
let selectedRow, tbody = null

const deleteRow = (elem) => {
	const row = elem.closest(TR)
	if (row) {
		const key = row.key 
		if (key && store.delete(key)) {
			row.remove()
		}
	}
}

const run = () => {
	if (store.rows.length > 0) {
		store.clear()  // Clear data but don't reset ID counter
		tbody.textContent = null
		selectedRow = undefined
	}
	renderWithProvider(tbody, (i) => store.create(i), 0, DEFAULT_SIZE, store.rows)
}

const add = () => {
	let start = store.rows.length
	appendWithProvider(tbody, (i) => store.create(i), start, DEFAULT_SIZE, store.rows)
}

const runLots = () => {
	if (store.rows.length > 0) {
		store.clear()  // Clear data but don't reset ID counter
		tbody.textContent = null
		selectedRow = undefined
	}
	renderWithProvider(tbody, (i) => store.create(i), 0, DEFAULT_SIZE_RUN_LOTS, store.rows)
}

const update = () => {
	for (let i = 0, len = store.rows.length; i < len; i += 10) {
		tbody.childNodes[i].childNodes[1].childNodes[0].lastChild.nodeValue = store.rows[i].label = `${store.rows[i].label}${BANG}`
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
	store.clear()
	// Don't reset globalThis.ID - it should persist across clear operations
	// The counter only resets on page reload (module re-initialization)
	selectedRow = undefined
	tbody.textContent = ''
}

const swapRows = () => {
	if (store.rows.length > SWAP_ROW) {
		let node1 = tbody.firstChild.nextSibling, 
			swapRow = tbody.children[SWAP_ROW],
			node999 = swapRow.nextSibling,
			row1 = store.rows[1]
		
		store.rows[1] = store.rows[SWAP_ROW]
		store.rows[SWAP_ROW] = row1
		
		tbody.insertBefore(node1.parentNode.replaceChild(swapRow, node1), node999)
	}
}

const init = async () => {
	tbody = await createTemplate('table', store.rows)
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

globalThis.document.querySelector(".ver").innerHTML += `${version} (keyed)`
globalThis.document.title += ` (keyed)`
addEventListeners()
init()

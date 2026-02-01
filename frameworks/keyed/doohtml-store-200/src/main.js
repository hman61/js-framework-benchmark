'use strict'

import {Timer, adjectives, colours, nouns} from '../../doohtml-timer-and-data/Timer.js'
import {render, createTemplate, append, appendWithProvider, renderWithProvider, version} from '../lib/doohtml.js'
// TODO: verify this is the fastest way to get random integers in single benchmark test suite

const _random = max => Math.trunc(Math.random() * max)

const lenA = adjectives.length, lenB = colours.length, lenC = nouns.length

const DEFAULT_SIZE = 1000, DEFAULT_SIZE_RUN_LOTS = 10000, SWAP_ROW = 998, BANG = ' !!!', DANGER = 'danger', TR = 'tr'

// Global ID counter - persists across renders, only resets on clear button
let globalIdCounter = 1

// Optimized Store class with Map for O(1) lookups
class Store {
	constructor() {
		this.rows = []
		this.rowsMap = new Map()  // For O(1) lookup by id
		this.selectedRow = null
	}

	// Optimized create method - direct array access, avoid repeated function calls
	create(index) {
		const id = globalIdCounter++
		// Direct array access is faster than function calls
		const adjIdx = Math.trunc(Math.random() * lenA) % lenA
		const colIdx = Math.trunc(Math.random() * lenB) % lenB
		const nounIdx = Math.trunc(Math.random() * lenC) % lenC
		
		// Use template literal (faster than concatenation)
		const label = `${adjectives[adjIdx]} ${colours[colIdx]} ${nouns[nounIdx]}`
		
		const row = { id, label }
		this.rows.push(row)
		this.rowsMap.set(id, row)
		return row
	}

	getIndex(key) {
		// Use Map for O(1) lookup instead of linear search
		const row = this.rowsMap.get(key)
		return row ? this.rows.indexOf(row) : -1
	}

	clear() {
		this.rows = []
		this.rowsMap.clear()
		this.selectedRow = null
		// Note: globalIdCounter is NOT reset here - only reset when clear button is pressed
	}
}

// Create store instance
const store = new Store()
let selectedRow, tbody = null

const deleteRow = (elem) => {
	const row = elem.closest(TR)
	if (row) {
		const key = row.key 
		const idx = store.getIndex(key)
		if (key && idx > -1) {
			const deletedRow = store.rows[idx]
			store.rows.splice(idx, 1)
			store.rowsMap.delete(key)
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
	Timer.start('tot', version)
	if (store.rows.length > 0) {
		store.clear()  // Clear data but don't reset ID counter
		tbody.textContent = null
		selectedRow = undefined
	}
	renderWithProvider(tbody, (i) => store.create(i), 0, DEFAULT_SIZE_RUN_LOTS, store.rows)
	Timer.stop('tot')
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
	globalIdCounter = 1  // Reset ID counter only when clear button is explicitly pressed
	selectedRow = undefined
	tbody.textContent = null
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

'use strict'

const _random = max => Math.random() * max | 0

const adjectives = ["pretty", "large", "big", "small", "tall", "short", "long", "handsome", "plain", "quaint", "clean", "elegant", "easy", "angry", "crazy", "helpful", "mushy", "odd", "unsightly", "adorable", "important", "inexpensive", "cheap", "expensive", "fancy"]
const colours = ["red", "yellow", "blue", "green", "pink", "brown", "purple", "brown", "white", "black", "orange"]
const nouns = ["table", "chair", "house", "bbq", "desk", "car", "pony", "cookie", "sandwich", "burger", "pizza", "mouse", "keyboard"]

const lenA = adjectives.length, lenB = colours.length, lenC = nouns.length

import Timer from './doo.timer.js'

Doo.define(
  	class Main extends Doo {
		constructor() {
			super(100)
			this.scrollTarget = '.table'
			this.defaultDataSet = 'rows'
			this.ID = 1
			this.data = {
				[this.defaultDataSet]: []
			}
			this.add = this.add.bind(this)
			this.run = this.run.bind(this)
			this.runLots = this.runLots.bind(this)
			this.update = this.update.bind(this)
			this.clear = this.clear.bind(this)
			this.swaprows = this.swapRows.bind(this)
			this.addEventListeners()
			this.selectedRow = undefined
			document.querySelector(".ver").innerHTML += ` ${Doo.version} (keyed)`
			document.title += ` ${Doo.version} (keyed)`
		}

		async dooAfterRender() {
			let target = this.shadow.querySelector(this.scrollTarget)
			this.tbody = this.shadow.querySelector('#tbody')
			if (!this.tbody) {
				let elem = document.createElement('tbody')
				elem.id = 'tbody'
				target.appendChild(elem)
			}
			target.addEventListener('click', e => {
				e.preventDefault()
				if (e.target.parentElement.matches('.remove')) {
					this.delete(e.target.parentElement)
				} else if (e.target.tagName === 'A') {
					this.select(e.target)
				}
			})
		}
	
		getParentRow(elem) {
        	while (elem) {
        		if (elem.tagName === "TR") {return elem}
        		elem = elem.parentNode
        	}
        	return undefined
        }

		buildData(count = 1000) {
			const data = [];
			for (let i = 0; i < count; i++) {
				data.push({id: this.ID++,label: adjectives[_random(lenA)] + " " + colours[_random(lenB)] + " " + nouns[_random(lenC)]})
			}
			return data	
		}
		getIndex(row) {
			let idx =  this.data.rows.findIndex((item, i) => {
				if (item.id === row.key) {
					return i
				}
			}) 
			return idx
		}

		delete(elem) {
			let row = this.getParentRow(elem)
			if (row) {
				this.tbody.removeChild(row)
				let idx = this.getIndex(row)
				if (idx !== undefined) {
					this.data.rows.splice(idx,1)
				}

			}
		}  

		run() {

			this.clear()
			this.data.rows = this.buildData()
			this.renderTable()

		}

		run(e) {
			Timer.start('tot')
			this.clear()
			this.data.rows = this.buildData()
			this.renderTable()
			e.target.blur()
			Timer.stop('tot')
		}


		add() {
			
			let newRows = this.buildData()
			this.data.rows = this.data.rows.concat(newRows)
			this.append(newRows)
		}
		add(e) {
			Timer.start('tot')
			//this.clear()
			let start = this.data.rows.length
			this.data.rows = this.data.rows.concat(this.buildData())
			this.append(this.data.rows, this.tbody, start)
			e.target.blur()
			Timer.stop('tot')

		}   



		runLots() {

			this.clear()
			this.data.rows = this.buildData(10000)
			this.renderTable(this.data.rows, this.tbody)
		}
		runLots(e) {
			Timer.start('tot')
			this.clear()
			this.data.rows = this.buildData(10000)	
			this.renderTable()

			e.target.blur()
			Timer.stop('tot')
		}


		update() {
			for (let i=0, len = this.data.rows.length;i<len;i+=10) {
				this.tbody.childNodes[i].childNodes[1].childNodes[0].innerText = this.data.rows[i].label += ' !!!'
			}
		}

		select(elem) {
			if (this.selectedRow) {
				this.selectedRow.classList.remove('danger')
				this.selectedRow = undefined
			}
			this.toggleSelect(this.getParentRow(elem))
		}

		toggleSelect(row) {
			if (row) {
				row.classList.toggle('danger')
				if (row.classList.contains('danger')) {
					this.selectedRow = row
				}	
			}    
		}

		clear(e) {
			this.tbody.textContent = ''
			this.data.rows = []
	
		}
		swapRows(e) {
			if (this.data.rows.length > 998) {
				Timer.start('tot')
				let row1 = this.data.rows[1],
				node1 = this.tbody.firstElementChild.nextSibling.cloneNode(true),
				node998 = this.tbody.childNodes[998].cloneNode(true)
				
				if (node1.classList.contains('danger') && this.selectedRow) {
					node1 = this.selectedRow
				} 					
				
				if (node998.classList.contains('danger') && this.selectedRow) {
					node998 = this.selectedRow
				} 					

				this.data.rows[1] = this.data.rows[998]
				this.data.rows[998] = row1
				
				this.tbody.childNodes[1].replaceWith(node998)
				this.tbody.childNodes[998].replaceWith(node1)
				if (this.tbody.childNodes[998].classList.contains('danger')) {
					this.selectedRow = this.tbody.childNodes[998]
				}	
				if (this.tbody.childNodes[1].classList.contains('danger')) {
					this.selectedRow = this.tbody.childNodes[1]
				}	


				e.target.blur()
				Timer.stop('tot')

			}
			// e.target.blur()
			// Timer.stop('tot')
		}
		insertAfter(newNode, referenceNode) {
			if (referenceNode.parentNode) {
			  referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
			}
		  
		}
		xrenderNode(place, data, start = 0, pgSize = Config.PAGE_SIZE) {
			const _getItemValue = (item, prop) => {
				if (typeof prop === 'function') {
					return this[prop](item)
				}
				let curValue = item
				try { 
					prop.split('.').forEach(key => curValue = curValue[key])
				} catch(e) {
					console.log('Property not found', prop, JSON.stringify(curValue))
				}
				return curValue
			}
			Timer.start('tot')

			let dataLen = data.length
			,stop = start + pgSize
			,html = ''
			,placeLen = place.templateArray.length-1
			,j=0
			if (stop > dataLen) { stop = dataLen }
			for (let i = start; i<stop; i++) {
				for (j=0; j<placeLen; j=j+2) {
					//html.push(place.templateArray[j])
					html += place.templateArray[j]
					if (place.templateArray[j+1] && place.templateArray[j+1].fld) {
					//html.push(_getItemValue(data[i],place.templateArray[j+1].fld))
					//html.push(_getItemValue(data[i],place.templateArray[j+1].fld))
					html += _getItemValue(data[i],place.templateArray[j+1].fld)
					}    
				}
			}
			//const x = html.flat().join('')
			Timer.stop('tot')

			return html
			//return html.join('')
		}
		

	
		xrenderNode(place, data, start = 0, pgSize = Config.PAGE_SIZE) {
			const _getItemValue = (item, prop) => {
				if (typeof prop === 'function') {
					return this[prop](item)
				}
				let curValue = item
				try { 
					prop.split('.').forEach(key => curValue = curValue[key])
				} catch(e) {
					console.log('Property not found', prop, JSON.stringify(curValue))
				}
				return curValue
			}
			Timer.start('tot')

			let pointer = start
			
			const val = (j, pointer) => data[pointer][place.templateArray[j].fld]
			

			let dataLen = data.length
			,stop = start + pgSize
			,y = place.templateArray.length
			,arr = place.templateArray.slice()
			arr[1] = val.call(this, 1,++pointer)
			arr[3] = val.call(this, 3, pointer)

			let html = Array(dataLen * y).fill(arr)
			let htmlLen = html.length
			// if (stop > dataLen) { stop = dataLen }
			// for (let i = 0; i<htmlLen; i = i+y) {
			// 	for (let j=1; j<y; j=j+2) {
			// 		if (place.templateArray[j] && place.templateArray[j].fld) {
			// 			//html[i + j] = _getItemValue(data[i],place.templateArray[j].fld)
			// 			html[i + j] = data[i][place.templateArray[j].fld]
			// 		}    
			// 	}
			// }
		//	console.log(html[0],html[1], html[2],html[3])
			const x = html.flat().join('')
			Timer.stop('tot')

			return x
			//return html.join('')
		}
		xrenderNode(place, data, start = 0, pgSize = this.PAGE_SIZE) {
			Timer.start('tot')
			const _getItemValue = (item, prop) => {
				if (typeof prop === 'function') {
					return this[prop](item)
				}
				let curValue = item
				try { 
					prop.split('.').forEach(key => curValue = curValue[key])
				} catch(e) {
					console.log('Property not found', prop, JSON.stringify(curValue))
				}
				return curValue
			}
			let dataLen = data.length
			,stop = start + pgSize
			,html = []
			,j=1
			,placeLen = place.templateArray.length
			place.templateArray.length
			if (stop > dataLen) { stop = dataLen }
		
			for (let i = start; i<stop; i++) {
				for (j=1; j<placeLen; j=j+2) {
					html.push(place.templateArray[j-1])
					html.push(_getItemValue(data[i],place.templateArray[j].fld))
				}
			}
			let x = html.join('') 
			Timer.stop('tot')
	
			return x //html.join('')
		}
	


		xrenderNode(place, data, start = 0, pgSize = Config.PAGE_SIZE) {
	 	Timer.start('tot')

			const _getItemValue = (item, prop) => {
				if (typeof prop === 'function') {
					return this[prop](item)
				}
				let curValue = item
				try { 
					prop.split('.').forEach(key => curValue = curValue[key])
				} catch(e) {
					console.log('Property not found', prop, JSON.stringify(curValue))
				}
				return curValue
			}

			let y = place.templateArray.length-1
		const arr = place.templateArray.splice()
			let dataLen = data.length
			,stop = start + pgSize
			,html = Array((dataLen * y) -1).fill('')
			,html2 = Array(2).fill(arr.slice(0,y))
	
			console.log(arr,html[0], html[1])
			const initialValue = '';

			if (stop > dataLen) { stop = dataLen }
			let pointer = 0
			//for (let i = start; i<stop; i++) {
			for (let i = start; i<dataLen; i++) {

				for (let j=1 ; j<y; j=j+2) {

					html[pointer + j -1] = arr[j-1]
					if (arr[j] && arr[j].fld) {
//						html[pointer + j] = _getItemValue(data[i],arr[j].fld)
						html[pointer + j] = data[i][arr[j].fld]
					}	
					pointer = (i + j)-1
					    
				}
			}
			console.log(html[0], html[1])
			console.log(html)
			const x = html.join('') 

/*
			if (stop > dataLen) { stop = dataLen }
			for (let i = start; i<stop; i++) {
				for (let j=0, len = place.templateArray.length; j<len; j=j+2) {
					html.push(place.templateArray[j])
					if (place.templateArray[j+1] && place.templateArray[j+1].fld) {
						html.push(_getItemValue(data[i],place.templateArray[j+1].fld))
					}    
				}
			}
			const x = html.join('') 
	
//			return html.join('')
*/
Timer.stop('tot')

return x //html.join('')
		}
		

		addEventListeners() {
			document.getElementById("main").addEventListener('click', e => {
				e.preventDefault()
				if (e.target.matches('#runlots')) {
					this.runLots(e)
				} else if (e.target.matches('#run')) {
					this.run(e)
				} else if (e.target.matches('#add')) {
					this.add(e)
				} else if (e.target.matches('#update')) {
					this.update()
				} else if (e.target.matches('#clear')) {
					this.clear(e)
				} else if (e.target.matches('#swaprows')) {
					this.swapRows(e)
				}
			})    
    	}
	}
)
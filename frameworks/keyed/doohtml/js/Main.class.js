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
		// runLots(e) {
		// 	Timer.start('tot')
		// 	this.clear(e)
		// 	this.data.rows = this.buildData(10000)	
		// 	this.renderTable()

		// 	e.target.blur()
		// 	Timer.stop('tot')
		// }


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

		xdooParse(argDataNode, component)  {
let Config = Doo.$Config
			const _getPropertyType = (fld, component) => {
				if (!fld) {
					return new FieldType('', undefined)
				}	
				fld = fld.trim()
			
				let type = Config.TYPE.DEFAULT
				if (fld.indexOf('(') > -1) {
					type = Config.TYPE.COMPUTED 
				 } else { 
					if (fld.indexOf(".") > 0) {
						type = Config.TYPE.DEEP
					} else if (!isNaN(fld)) {
						type = Config.TYPE.ENUM
					}
				}
			
				let fieldType = new FieldType(fld, type)
		
				//TODO this needs to be scooped	
				component.visibleColumns.push(fld) 
				fieldType.parentElem = component.parentElement
				
				return fieldType
			}
			
			const  _xAttr =  ['src', 'selected', 'checked',  'disabled', 'readonly']  
	
		
			//TODO remove HTML comments
			//TODO replace {{}} in <code></code> and <pre></pre> with escaped "\{\{" 
			//TODO Allow for nested {{templateRoot{{yyy}}zzz}}
			let tplNode = argDataNode.cloneNode(true)
			tplNode.removeAttribute(Config.DATA_BIND)
			//tplNode.removeAttribute('dynamic')
			let htmlStr = tplNode.outerHTML.replace(/\t/g, '').replace(/\n/g, '')
			let orgStr = htmlStr
			//covers checked="false" where browser returns true 
			//TODO: check modern browser to see if it still is an issue
			_xAttr.forEach(item => {
				htmlStr = htmlStr.replace(new RegExp(' ' + item + '="{{(.+)}}"', 'g'), ' doo-' + item + '="{{$1}}"')
			})
			let xHtml = (orgStr === htmlStr)
			// if (window[this.constructor.name] === undefined) {
			//     window[this.constructor.name] = []
			// } 
			//TODO bind(this)
			// let inst =  window[this.constructor.name].length
			// htmlStr = htmlStr.split('="doo.self.').join('="' + this.constructor.name + '[' + inst + '].');
			// htmlStr = htmlStr.split('="self.').join('="' + this.constructor.name + '[' + inst + '].');
			//TODO allow key with no value
			// if (this.getAttribute('key')) {
			// 	htmlStr = htmlStr.split(' key ').join(' key="{{ i() }}" ');
			// }	
			let aHTML = htmlStr.split(Config.DELIMITER.END)
		
			let templateArray = []
			let len = aHTML.length
			let aStr
		
			for (let i=0; i<len; i++) {
				if (Config.DELIMITER.BEG.includes(Config.DELIMITER.BEG)) {
					aStr =  aHTML[i].split(Config.DELIMITER.BEG)
					templateArray.push(aStr[0])	
					templateArray.push(_getPropertyType(aStr[1],component))		
				}	
			} 
			return {templateArray,xHtml}
		}
	

		xrenderNode(place, data, start = 0, pgSize = Config.PAGE_SIZE) {
	 	Timer.start('tot')

if (!data.length) return ''
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
		const arr = place.templateArray.splice(0,y)
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
//			console.log(html[0], html[1])
//			console.log(html)
			const x = html.join() 

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
			Timer.stop('tot')
	
//			return html.join('')
*/
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
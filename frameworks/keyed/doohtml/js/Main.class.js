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
			this.clear(e)
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
			let len = this.data.rows.length
			if (e && len) {
				
				Timer.start('tot')
				this.tbody.remove()
				debugger
				this.dooAfterRender()
				//textContent = ''
				// while (this.tbody.lastElementChild) {
				// 	this.tbody.lastElementChild.remove()
				// }
				// let tbody = this.tbody.childNodes
				// for (let i=len-1;i>=0;--i) {
				// 	tbody.item(i).remove()
				// }		
		
				e.target.blur()
				Timer.stop('tot')
			} else {
				this.tbody.textContent = ''
			}
			this.data.rows = []
	
		}
	/*	
		renderTable(dataSet=this.data[this.defaultDataSet],target=this.place[0], start=0) {
//			let elem = document.createElement(target.tagName),len = dataSet.length, i = len - 1
			let elem = document.createElement(target.tagName),len = dataSet.length //, i = len
	//		elem.id = 'tbody'
			elem.innerHTML = this.renderNode(target, dataSet, start , len - start)
	//		let nodes = document.createTreeWalker(elem,1)
			let tableRows = elem.querySelectorAll('tr')
		//	const tr = document.createElement('tr')
		// do {
		// 	//	target.insertBefore(elem.content.removeChild(elem.content.lastElementChild), target.firstElementChild).key = dataSet[i].id
		// 		target.insertBefore(elem.removeChild(elem.lastElementChild), target.firstElementChild).key = dataSet[i].id

		// 	} while ( --i >=0)
		// 	do {
		// 		target.appendChild(elem.childNodesinsertBefore(elem.removeChild(elem.lastElementChild), target.firstElementChild).key = dataSet[i].id
		// 	} while ( --i >=0)
	
//debugger
//target.append(nodes)
			for (let i=0;i<len; i++) {
			 	target.appendChild(tableRows.item(i)).key = dataSet[i].id
			}	
	//		let node = nodes.root
		//	do {
	//			target.append([...nodes.root.childNodes])
//				this.tbody = target.parentElement.querySelector('#tbody')
//debugger
				//target.appendChild(elem.childNodesinsertBefore(elem.removeChild(elem.lastElementChild), target.firstElementChild).key = dataSet[i].id
		//	} while (node = node.nextNode())

			// 	//let x = 
			// 	target.appendChild(tableRows.item(i))
			// 	//x.replaceWith(tableRows.item(i))
			// }
			//debugger
			
		//	target.parentNode.firstElementChild.replaceWith(elem)
		//	this.tbody = this.shadow.querySelector('#tbody')

		}
	
*/
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
//debugger
				// if (node998.classList.contains('danger')) {
				// 	this.select(this.tbody.childNodes[998])
				// }  
				this.tbody.childNodes[998].replaceWith(node1)
				if (this.tbody.childNodes[998].classList.contains('danger')) {
					this.selectedRow = this.tbody.childNodes[998]
				}	
				if (this.tbody.childNodes[1].classList.contains('danger')) {
					this.selectedRow = this.tbody.childNodes[1]
				}	


				// if (node1.classList.contains('danger')) {
				// 	this.select(this.tbody.childNodes[1])
				// }	
				e.target.blur()
				Timer.stop('tot')

			}
			// e.target.blur()
			// Timer.stop('tot')
		}
		/*
		swapRows(e) {
			Timer.start('tot')

			if(this.data.rows.length > 998) {
				const view0 = this.tbody.firstElementChild;
				const view1 = view0.nextSibling;
				const view997 = this.tbody.childNodes[998];
				const view998 = view997.nextSibling;
					// export function insertAfter(newNode: Element, referenceNode: Element) {
					// 	if (referenceNode.parentNode) {
					// 	  referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
					// 	}
					//   }
					//   referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
					
				const	row1 = this.data.rows[1]
				
					this.data.rows[1] = this.data.rows[998];
					this.data.rows[998] = row1
		
				this.tbody.insertBefore(view998, view0);
				this.tbody2.parentNode.insertBefore(view1, view997);
				
			}
			e.target.blur()
			Timer.stop('tot')

		}
		*/
		insertAfter(newNode, referenceNode) {
			if (referenceNode.parentNode) {
			  referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
			}
		  
		}
/*

		swapRows(e) {

					  Timer.start('tot')
				//	  let tableRows = this.tbody.querySelectorAll('tr')
			//		  #tbody > tr.danger


					 // #tbody > tr:nth-child(2)
			if(this.tbody.children.length > 998) {
				Timer.start('tot')
				// const view0 = this.tbody.querySelector('tr:nth-child(1)');
				// const view1 = view0.nextSibling;
				// const view997 = this.tbody.querySelector('tr:nth-child(997)');
				// const view998 = view997.nextSibling;

			//	let view0 = this.tbody.firstElementChild,
				let view1 = this.tbody.firstElementChild.nextSibling,
				view998 = view997.nextSibling
			//view997 = this.tbody.childNodes[998],
	

				// const view0 = tableRows.item(0);
			//	 let view1 = tableRows.item(1),
			// view998 = tableRows.item(998);

				// const view997 = tableRows.item(997);


				const	row1 = this.data.rows[1]
				
				this.data.rows[1] = this.data.rows[998];
				this.data.rows[998] = row1

		  
			//   if (
			// 	view0 &&
			// 	view1 &&
			// 	view997 &&
			// 	view998
			//   ) {

				this.tbody.insertBefore(view998, view1);
				this.tbody.insertBefore(view1, view998);
				//view1.parentNode.insertBefore(view998, view1);
				//view998.parentNode.insertBefore(view1, view998);


	//			this.insertAfter(view998, view0);
	//			this.insertAfter(view1, view997);
//			  }
				e.target.blur()
				Timer.stop('tot')

			}

		}
*/		


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
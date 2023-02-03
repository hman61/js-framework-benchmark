import Config from './Doo-Config'
//import Doo from './doo.html'
import X from './Doo-X'
//import Timer from './doo.timer'
//import {  createDooTemplate } from './Doo-Template'

class FieldType {
	constructor(fld, type) {
		this._fld = fld
		this.type = type
		this._func = undefined
		this._parentElem = undefined
		this.$1 = undefined
		this.$2 = undefined
		this.$3 = undefined
		this.$4 = undefined
		this.$5 = undefined

		if (this.type === Config.TYPE.COMPUTED) { 
			this.createComputed()
		}	
	}
	set fld(fld) {this._fld=fld}
	set parentElem(parentElem) {this._parentElem = parentElem} 
	set func(func) {this._func = func}
	get fld() {return this._fld}
	get func() {return this._func}
	//TODO simplyfy use computed columnMap
	createComputed() {
		//TODO create a regEx for more elegant parsing
		let breakParams = this.fld.split('(')
		let computedArr = breakParams[0].split('.').reverse()
		let funcName = computedArr[0]
		// if (Reflect.ownKeys(this.klass).filter(key=>key===funcName).length > 0) {
		// 	this.func = this.klass[funcName]
		// 	if (Doo.$Computed[funcName]) {
		// 		console.log('WARNING: ', 'Overwriting a Doo base Doo.$Computed method is not recommended' );
		// 	}
		// } else if (Doo.$Computed[funcName]) { 	
		// 	this.func = Doo.$Computed[funcName]
		// }
		this.fld = computedArr.length > 1 ? computedArr[1] : undefined
		if (typeof this.func !== 'function') {
			console.log('static ' + funcName + '() is not defined in Doo nor has it been defined as a static function in this component')
			//type = undefined
		}
		let params = breakParams[1].replace(')','')
		if (params && params.length > 0) {
			params = params.split(',')
			for (let k=0,len=params.length;k<len;k++ ) {
				this['$'+(k+1)]= params[k].replace(/'/g,'').replace(/"/g,'')
			}
		}
	} 
}



export class DooHTML extends HTMLElement {
//	static DAO = DooHTML.DAO
	static get version() {return 'v0.90.2b'}

	static define(klass, alias=null) {
		let name = alias || klass.name.toLowerCase()
		customElements.define('doo-' + name, klass)
	}	
	constructor(pageSize=Config.PAGE_SIZE) {
		super()
		this.PAGE_SIZE = pageSize	
		this.data = {}
		this.place = []
		this.template = undefined	
		this.visibleColumns = []
	}
	//set PAGE_SIZE(pageSize) {this.PAGE_SIZE = pageSize }  // remove handled by props

	static get observedAttributes() {
		return ['doo-refresh','data-src','data-key','data-template','bind', 'data-page', 'data-page-size', 'page-size']
	}

	async attributeChangedCallback(name, oldVal, newVal) {
		
		//TODO do we need length???
		if (newVal.length > 0 && oldVal !== newVal) {
			if (name === 'doo-refresh' && this.dataset.store) {
				await this.render(Doo.X.getData(this.getAttribute('bind')))
			} else if (name === 'data-use-state') {
				//doo noting yet
			// } else if (name ==="doo-dispatch") {
			// 	console.log('coolio',(this.getAttribute('bind')))

			// 	await this.render(Doo.X.getData(this.dataset.src))
			} else if (name === 'data-store') {
				// let dao = window[this.dataset.store]
				// console.log(dao)
			} else if (name === 'page-size') {
				this.PAGE_SIZE = newVal
			} else if (name === 'doo-after-render') {
				if (typeof newVal === 'function') {
					newVal.call(this)
				}
			} else if (name === 'debug') {
				Doo.debug = true
			}	
		}	
	}
	dooParse(argDataNode, component)  {

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
		//tplNode.removeAttribute('data-bind')  //TODO remove from lower places
		tplNode.removeAttribute('data-key')
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
				if (aStr[1]) {
					templateArray.push(_getPropertyType(aStr[1],component))		
				}	
			}	
		} 
		return {templateArray,xHtml}
	}
	
	initReactiveDataNodes(tplNode) {
		const _getNodeLevel = (dataSetElem) => {
			let level = 0
			while (dataSetElem.parentElement) {
				dataSetElem = dataSetElem.parentElement
				level++
			}
			return level;
		}
	
		this.dataMap = null
		this.flex = null
		if (this.hasAttribute('data-map')) {
			if (this.getAttribute('data-map').indexOf('Doo.reflect') === 0) {
				this.dataMap = Reflect.ownKeys(DooX.getData(this.getAttribute(Config.DATA_BIND))[0])
			} else {	
				this.dataMap = this.getAttribute('data-map').split('|')
			}
		}
		if (this.hasAttribute('flex')) {
			this.flex = this.getAttribute('flex').replace('[', '').replace(']', '').split('|')
		}

		const replacer = (match, p1) => {
			if (isNaN(p1)) {
				return this.hasAttribute(p1) ? this.getAttribute(p1) : 
						tplNode.hasAttribute(p1) ? tplNode.getAttribute(p1) : '';
			} else if (this.dataMap.length > 0) {
				return Config.DELIMITER.BEG + this.dataMap[p1-1] + Config.DELIMITER.END 
			}	
		}

		let dynamicNodes = tplNode.content.querySelectorAll('[data-src="${data-map}"]')
		if (dynamicNodes.length > 0) {
			[...dynamicNodes].forEach( dNode => { 
				let colObj = []
				this.dataMap.forEach( (item, i)  => {
					let flexGrow = this.flex[i] === undefined ? 1 : this.flex[i]
					let aItem = item.split(':')
					let label = aItem.length > 1 ? aItem[1]  : aItem[0]  
					let dooJustify = ''
					if (flexGrow.includes(':')) {
						dooJustify = flexGrow.split(':').length > 2 ? 'doo-center' : 'doo-end'
						flexGrow = flexGrow.replace(/:/g,'')
					}
					colObj.push({label: label, fieldName: this.dynamicField(aItem[0]), flex: flexGrow, flexJustify: dooJustify })
				})

				let dHtml = this.htmlParse(dNode, colObj)
				let parentElem = dNode.parentElement
				parentElem.removeChild(dNode)
				parentElem.innerHTML = dHtml + parentElem.innerHTML
			})		
		}

		tplNode.innerHTML = tplNode.innerHTML.replace(/\$\{(.+?)\}/gm, replacer)
		let dSrc = tplNode.content.querySelectorAll('[' +  Config.DATA_BIND + ']');
		[...dSrc].forEach( reactNode  =>  {
			if (!reactNode.hasAttribute('data-src')) {
				let dataSrc = this.hasAttribute('doo-dispatch') ? 'DooX' : 'this.data' 
				reactNode.setAttribute('data-src' , dataSrc)
			}	
		})
		let reactiveElems = tplNode.content.querySelectorAll('[data-src]')
		let len = reactiveElems.length
		let i = 0
		let reactiveElem = [], dataElem, dataSet
		for (i=0;i<len;i++) {
			let key = reactiveElems[i].getAttribute(Config.DATA_BIND)  
			let dataSrc = reactiveElems[i].getAttribute('data-src')
			if (dataSrc) {
//				if (dataSrc === 'DooX') {
					this.setAttribute('doo-dispatch', key)
					dataSet = dataSrc.trim() //DooX.getData(key)
//				} else {
//					dataSet = this.host[dataSrc] // await this.getDataObj(dataSrc, reactiveElems[i] )
//					dataSet = await this.getDataObj(dataSrc, reactiveElems[i] )
//				}
//				this.data[key] = Array.isArray(dataSet) ? dataSet : dataSet[key]
			} 
			if (dataSrc.indexOf('this.parent') === 0) {
				reactiveElems[i].useParent = true
			}

			reactiveElems[i].removeAttribute('data-src')
			reactiveElems[i].level = _getNodeLevel(reactiveElems[i])
			reactiveElem.push(reactiveElems[i])
		}
		this.removeAttribute('data-map')
		this.removeAttribute('flex')
		this.removeAttribute('data-fetch')

		const orderByLevel = (a,b) => {
			return ((a.level === b.level) ? 0 : (a.level > b.level) ? 1 : -1)
		}

		reactiveElem.sort(orderByLevel).reverse()

		for (i=0;i<len;i++) {
			if ('|STYLE|LINK|'.indexOf(`|${reactiveElem[i].tagName}|`) > -1) {
				dataElem = reactiveElem[i]
			} else if (reactiveElem[i].parentElement && (reactiveElems[i].getAttribute(Config.DATA_BIND) === 'void' ||  '|DL|UL|TBODY|THEAD|TFOOT|TR|SELECT|SECTION|'.indexOf(`|${reactiveElem[i].parentElement.tagName}|`) >-1)) {
				//TODO remove slots or elem with doo-static attribute, and put as first child after render 
				dataElem = reactiveElem[i].parentElement
			} else {
				dataElem = document.createElement('data')	
			}
			dataElem.dataKey = reactiveElem[i].getAttribute(Config.DATA_BIND)
			let parsedNode = this.dooParse(reactiveElem[i], this,  this.dataMap)
			dataElem.templateArray = parsedNode.templateArray 	
			dataElem.xHtml = parsedNode.xHtml 	
			dataElem.name = i
			dataElem.level = _getNodeLevel(reactiveElem[i])
			dataElem.useParent = reactiveElem[i].useParent
			dataElem.noRepeat = reactiveElem[i].hasAttribute('data-norepeat')
			if (dataElem.tagName === 'DATA' || dataElem.tagName === 'STYLE' || dataElem.tagName === 'LINK') {
				//TODO allow for templates not to require single root node 
				if (reactiveElem[i].parentElement) {
					reactiveElem[i].parentElement.replaceChild(dataElem, reactiveElem[i])
				} else {
					//TODO consider adding single child node on the fly
					console.log('Warning: Templates should only have one childnode')
					reactiveElem[i].appendChild(dataElem)					
				}	
			}
			this.place.push(dataElem)
		}
		return this.place
	}
	async setContext() {
		//TODO tie this to the Doo object and bind it more elegantly
		// if (!window[this.constructor.name]) {
		// 	window[this.constructor.name] = []
		// }
		// window[this.constructor.name].push(this)
		if (this.childNodes.length >0) {
			if (this.getElementsByTagName('template') && this.getElementsByTagName('template').length > 0) {
				this.removeChild(this.getElementsByTagName('template').item(0))
			}	
		}	
		let context = this.getAttribute('context') || Config.SHADOW 
		if (context === Config.SHADOW) {
			this.componentContainer = this.shadow.host
			this.showComponentContainer(false)
			let currentClasses = this.templateElem.firstElementChild.hasAttribute('class') ? ' ' + this.templateElem.firstElementChild.getAttribute('class') : ''
			let parentClasses = this.hasAttribute('class') ? this.getAttribute('class') + ' ' : ''
			if (parentClasses + currentClasses !== '' && this.templateElem.firstElementChild) {
				this.templateElem.firstElementChild.setAttribute('class', `${parentClasses}${currentClasses}`)
			}
			this.shadow.appendChild(this.templateElem)
		} else if (context === Config.DOCUMENT) {
			this.componentContainer = this.parentElement
			this.showComponentContainer(false)
			this.componentContainer.replaceChild(this.templateElem, this)
		}	
		this.initialHeight = this.shadow.firstElementChild.offsetHeight
	}

	renderNode(place, data, start = 0, pgSize = Config.PAGE_SIZE,clear=true) {
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
		,placeLen = place.templateArray.length
		,j=0
		const node1 = document.createElement('tbody')
		if (clear) {
			place.textContent = ''
		}
		if (stop > dataLen) { stop = dataLen }
		for (let i = start; i<stop; i++) {
			for (j=0; j<placeLen; j=j+2) {
				html.push(place.templateArray[j])
				if (typeof place.templateArray[j+1] === 'object') {
					html.push(_getItemValue(data[i],place.templateArray[j+1].fld))
				}	
			}
			node1.innerHTML = html.join('')

			html = []
			place.appendChild(node1.firstElementChild).key = i

		}
	}
 
	// _highlight(val, filterVal)  {
	// 	let filterKey = filterVal && filterVal.toLowerCase()
	// 	if (!filterKey || !val) {return val}
	// 	let re = new RegExp(filterKey, "ig")
	// 	let value = val.toString().replace(/&amp;/gi,'&')
	// 	//TODO make <b> configurable
	// 	return value.replace(re, txt => `<b class="doo-find">${txt}</b>`)
	// }


	showComponentContainer(show=true) {
		if (this.componentContainer) {
			this.componentContainer.style.visibility = show ? 'visible' : 'hidden'
		}	
	}
	renderTable(dataSet=this.data[this.defaultDataSet],target=this.place[0], start=0) {
		let len = dataSet.length
		if (len === 0) {
			target.textContent = ''
			this.showComponentContainer()
			return
		}
		//target.innerHTML = this.renderNode(target, dataSet, start , len - start)
		this.renderNode(target, dataSet, start , len - start)
		// do {
		// 	target.insertBefore(elem.content.removeChild(elem.content.lastElementChild), target.firstElementChild).key = dataSet[i].id
		// } while ( --i >=0)
		this.showComponentContainer()
	}
	append(dataSet=this.data[this.defaultDataSet],target=this.place[0], start=0) {
		this.renderNode(target, dataSet, start , dataSet.length - start, false)
		this.showComponentContainer()
	}	
	walkUpToRenderedChild(node) {
		do  {
			node = node.parentNode
		} while (node.parentNode !== this.place[0])
		return node		
	}

	getIndex(row) {
		let idx =  this.data.rows.findIndex((item, i) => {
			if (item.id === row.key) {
				return i
			}
		}) 
		return idx
	}

	render(dataSetName=null, page=0, replaceOrAppendRow=null)  {
		if (!this.template) {
			console.error(this.name + ' has no template defined')
			console.log('You need to set a data-template attribute on the <doo-html /> component')
			console.log('You can referense you data-template by a template id')
			console.log('Example: <doo-html data-template="#t1" .../>')
			console.log('Templates can also be external and you can use reletive path to access it')
			console.log('Example: <doo-html data-template="./templates/t1.html" .../>')
			return
		} 
		if (!this.place) {
			//TODO make the root the default
			console.log('No target set on the component or inside the template. USAGE: set the bind=dataKey or data-src=data-key')
		}
		for (let i=0, len=this.place.length;i<len;i++) {
			if (this.place[i].tagName === 'TR' || this.place[i].tagName === 'TBODY' || this.place[i].tagName === 'TABLE') {
				this.renderTable(dataSetName, this.place[i], page )
			}  
			if (dataSetName && dataSetName !== this.place[i].dataKey) {
				continue   // TODO other for-eachs that are children of the specified data set proably needs to be re-rendered (needs test scenarios)
			}
			if (page === 0 && this.place[i].tagName !== 'STYLE' && !this.place[i].classList.contains('fhead')) {
				let pg = this.place[i].getAttribute(Config.DATA_BIND) === 'dummy' ? -1 : 0 
				this.place[i].setAttribute("page", pg);
			}	
			let dataKey = this.place[i].dataKey
			//this.getFilteredData(this.place[i].dataKey) ? this.getFilteredData(this.place[i].dataKey) : this.data[this.place[i].dataKey]
			let pageSize = this.place[i].noRepeat ? 1 : this.PAGE_SIZE
			if (replaceOrAppendRow === null) {
				// if (this.place[i].useParent) {
				// 	this.place[i].innerHTML =  this.renderNode(this.place[i], dataKey, parseInt(this.getAttribute('key')) , 1)
				// } else {	
					this.place[i].innerHTML =  this.renderNode(this.place[i], dataKey,  page * this.PAGE_SIZE, pageSize)
				// }	
			} else {
				this.place[i].append(this.renderNode(this.place[i], dataKey,  replaceOrAppendRow, 1))
			}
		}		
		this.showComponentContainer()
		return page	
	}
	async connectedCallback() {
		let context = this.getAttribute('context') || Config.SHADOW 
		this.shadow = context === Config.SHADOW ? this.attachShadow({mode: 'open'}) : document
		if (!this.defaultDataSet && this.getAttribute('bind')) {
			this.defaultDataSet = this.getAttribute('bind')
			//this.scrollTarget = Config.FLEX_BODY
		}	
		let tag = this.constructor.name.toLowerCase()

		if (this.scrollTarget) {
			this.scrollElem = this.shadow.querySelector(this.scrollTarget)
		} 

		this.template = this.getAttribute('template')

		this.templateNode = await this.createDooTemplate(this.template)
		this.templateElem = this.templateNode.content
		this.initReactiveDataNodes(this.templateNode)
		this.setContext()
		if (window['dooAfterRender'] && typeof window['dooAfterRender'] === 'function') {
			window['dooAfterRender']()
		}
		// TODO make sure that this is safe
		this.render([],this.place[0])
		//this.setAttribute('doo-refresh', new Date().getTime())
		// if (typeof this.dooAfterRender === 'function') {
		// 	this.setAttribute('doo-after-render', 'dooAfterRender')
		// }
			if (typeof this.dooAfterRender === 'function') {
				await this.dooAfterRender()
			}

	}
	fetchTemplate(url) {
		return new Promise((resolve, reject) => {
		  const xhr = new XMLHttpRequest()
		  xhr.open("GET", url)
		  xhr.onload = () => resolve(xhr.responseText)
		  xhr.onerror = () => reject(xhr.statusText)
		  xhr.send();
		})
	}
	
	async createDooTemplate(templateIdOrPath) { 
		let tpl = ''
		if (templateIdOrPath.indexOf('#') === 0) {
			tpl =  document.querySelector(templateIdOrPath).outerHTML
		} else {
			tpl = await fetchTemplate(url)
		}
		let elem = document.createElement('div')
		elem.innerHTML = tpl
		if (elem.querySelector('template')) {
			//TODO create ERROR slot or Doo.$Config constant
			elem.innerHTML = elem.querySelector('template') ? tpl : `<template><center><pre>The template you are trying to import does not have a &lt;template&gt tag</pre><div style="color:red">${this.template}</div></enter></template>`
		}
		//TODO check for null pointer
		let importedTemplate = elem.querySelector('template').cloneNode(true)
		importedTemplate.removeAttribute('id')
	
		let templateNode  = document.createElement('template')
		templateNode.innerHTML = importedTemplate.innerHTML
	
		// TODO warn when there are multiple children (maybe not needed, not sure)
		if (!templateNode.content.parentElement) {
			let tplRootNode = document.createElement('section');
			tplRootNode.innerHTML = templateNode.innerHTML
			templateNode.innerHTML = tplRootNode.outerHTML
		}
		
		//TODO implement css="inherit" and use https://developer.mozilla.org/en-US/docs/Web/API/DocumentOrShadowRoot to bring them in
		// if (!shadow && component.getAttribute('css')) {
		//     let cssList = this.getAttribute('css').split(',')
		//     let len = cssList.length 
		//     for (let i=0;i<len;i++) {
		//         let link = document.createElement('link')
		//         link.href = cssList[i]
		//         link.rel = "stylesheet"
		//         //this.templateNode.content.firstElementChild.parentNode.insertBefore(link, this.templateNode.content.firstElementChild)
		//         templateNode.content.firstElementChild.parentNode.insertBefore(link, this.templateNode.content.firstElementChild)
		//     }
		// }
		let templateElem = templateNode.content
	
		let styleNode = templateElem.querySelectorAll('style')
		//TODO support multiple style nodes within the template
		if (styleNode && styleNode.length > 0) {
			templateElem.appendChild(styleNode[0])
		}
		return templateNode
	}
	

}	
if (!window.DooHTML) {
	DooHTML.X = X
	//Doo.Config = Config
	window.Doo = DooHTML
	window.DooHTML = DooHTML
}	
		
DooHTML.define(DooHTML,'html')

export default DooHTML


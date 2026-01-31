const Config = {
	NAME:'DooHTML',
	DATA_BIND:'data-bind',
	DATA_TEMPLATE:'data-template',
	MATCH:{ANY:-1,STARTS_WITH:0,EXACT:1},
	DELIMITER:{'BEG':'{{','END':'}}'},
	DATA_KEY:'data-key',
	KEY:'key'
}

const {cloneNode} = globalThis.Node.prototype;
const cloneDeep = n => cloneNode.call(n, true);


// TODO: test in single benchmark test suite
// const cloneDeep = (node) => {
//     if (!node || typeof node.cloneNode !== 'function') return node;
//     return node.cloneNode(true); // Deep clone for DOM
// };


const version = 'v0.98.8-dataProvider'

const getItemValue = (item, prop) => {
    if (!prop.includes('.')) {
        return item[prop] ? item[prop] : ''
    }

    return prop.split('.').reduce((acc, key) => {
        return acc && acc[key] !== undefined ? acc[key] : ''
    }, item)
}

const getNode = (node, arr) => arr.reduce((currentNode, index) => currentNode?.childNodes[index] || null, node)


const isTable = (node) => {
	return ['TABLE','TBODY','THEAD','TFOOT','TR','TH'].includes(node.tagName)
}

const setNodeValues = (node, dataItem, dataSlots) => {
	const len = dataSlots.length
	for (let x = 0; x < len; x++) {
		const curNode = getNode(node, dataSlots[x][1], 0)
		if (curNode) {
			if (dataSlots[x][2] === 'textContent') {
				curNode.nodeValue = dataItem[dataSlots[x][0]]
			} else {
				curNode.setAttribute(dataSlots[x][2], dataItem[dataSlots[x][0]])
			}
		} else {
			globalThis.console.log('Field:' + dataSlots[x][0] + ' does not exist')
		}
	}
}

const render = (target, data, start = 0) => {
	if (data.length === 0) {
		target.textContent = ''
		return
	} 
	renderHTML(target, data, start)
}	

const renderHTML = (target, data, start = 0, end=null) => {
	let dataLen = data.length
	
	let	stop = end ? start + dataLen :  dataLen - start
	if (stop > dataLen) { stop = dataLen }

	const key = target[Config.KEY]
	for (let i = start; i<stop; ++i) {
		setNodeValues(target.processNode, data[i], target.dataSlots)
		let cloned = cloneDeep(target.processNode)
		cloned[Config.KEY] = getItemValue(data[i],key)
		target.append(cloned)

	}

}

const renderHTMLWithProvider = (target, dataProvider, start = 0, length = null, rows = []) => {
	if (length === null || length === 0) {
		return
	}
	
	const stop = start + length
	const key = target[Config.KEY]
	
	// Single loop: call provider for each index and immediately inject
	for (let i = start; i < stop; ++i) {
		// Call provider to get single data object for this index (provider will push to rows)
		const dataItem = dataProvider(i, rows)
		
		// Immediately inject into HTML template
		setNodeValues(target.processNode, dataItem, target.dataSlots)
		let cloned = cloneDeep(target.processNode)
		cloned[Config.KEY] = getItemValue(dataItem, key)
		target.append(cloned)
	}
}

const renderWithProvider = (target, dataProvider, start = 0, length = null, rows = []) => {
	renderHTMLWithProvider(target, dataProvider, start, length, rows)
}

const append = (target, dataSet, start=0) => {
	renderHTML(target, dataSet, start , dataSet.length - start)
}

const appendWithProvider = (target, dataProvider, start = 0, length = null, rows = []) => {
	if (length === null || length === 0) {
		return
	}
	
	const stop = start + length
	const key = target[Config.KEY]
	
	// Single loop: call provider for each index and immediately inject
	for (let i = start; i < stop; ++i) {
		// Call provider to get single data object for this index (provider will push to rows)
		const dataItem = dataProvider(i, rows)
		
		// Immediately inject into HTML template
		setNodeValues(target.processNode, dataItem, target.dataSlots)
		let cloned = cloneDeep(target.processNode)
		cloned[Config.KEY] = getItemValue(dataItem, key)
		target.append(cloned)
	}
}	

const dooParse = (argDataNode) => { 
	const  _xAttr =  ['src', 'selected', 'checked',  'disabled', 'readonly']  

	let tplNode = cloneDeep(argDataNode)
	tplNode.removeAttribute(Config.DATA_BIND)
	delete tplNode.dataset.key
	let htmlStr = tplNode.outerHTML.replaceAll('\t', '').replaceAll('\n', '')
	let orgStr = htmlStr
	_xAttr.forEach(item => {
		htmlStr = htmlStr.replaceAll(new RegExp(' ' + item + '="{{(.+)}}"', 'g'), ' doo-' + item + '="{{$1}}"')
	})
	let xHtml = (orgStr === htmlStr)

	let elem = globalThis.document.createElement('template')
	elem.innerHTML = htmlStr
	let dataSlots = []
	
	const addDataSlot = (item, fld, type) => {
		let slot = []
		let child = item
		while (child !== elem.firstElementChild) {
			let prev = child.previousSibling
			let cnt = 0

			while (prev) {
				cnt++
				prev = prev.previousSibling
			}
			child = child.parentNode
			if (child) {
				slot.unshift(cnt)
			}	
		} 
		dataSlots.push([fld,slot.slice(1),type])
	}

	const textWalker = globalThis.document.createTreeWalker(
		elem.content,
		globalThis.NodeFilter.SHOW_TEXT,
		{
			acceptNode() {
				return globalThis.NodeFilter.FILTER_ACCEPT
			},
		}
	)

	let textNode = textWalker.nextNode()
	let multiText = []		
	while (textNode) {
		let val = textNode.wholeText.trim()
		if (val.indexOf('{{') === 0 && val.lastIndexOf('}}') === val.length-2) {
			//do nothing
		} else {	
			let text = val.replaceAll('{{', '<span>{{').replaceAll('}}', '}}</span>')
			multiText.push({node:textNode.parentNode, oldText:val, newText:text})

		}
		textNode = textWalker.nextNode()
	}
	for (let i=0, len = multiText.length; i<len; i++) {
		multiText[i].node.innerHTML = multiText[i].node.innerHTML.replace(multiText[i].oldText,multiText[i].newText) 
	}
		
	let processedElem = cloneDeep(elem.content)


	const treeWalker = globalThis.document.createTreeWalker(
		processedElem,
		globalThis.NodeFilter.SHOW_TEXT,
		{
			acceptNode() {
				return globalThis.NodeFilter.FILTER_ACCEPT
			},
		}
	)

	let currentNode = treeWalker.nextNode()
	while (currentNode) {
		const matches = currentNode.nodeValue.match(/\{\{(.*?)\}\}/g)
		if (matches) {
			const parent = currentNode.parentNode
			matches.forEach((match) => {
				const fld = match.replaceAll(/\{\{|\}\}/g, '').trim()
				const textNode = globalThis.document.createTextNode(fld)
				currentNode.textContent = ''
				// eslint-disable-next-line unicorn/prefer-dom-node-append
				const newNode = parent.appendChild(textNode)
				addDataSlot(newNode, fld, 'textContent')
			})
		}

		currentNode = treeWalker.nextNode()
	}

	const elemWalker = globalThis.document.createTreeWalker(
		processedElem,
		globalThis.NodeFilter.SHOW_ELEMENT,
		{
			acceptNode() {
				return globalThis.NodeFilter.FILTER_ACCEPT
			}
		}
	)

	currentNode = elemWalker.nextNode()
	while (currentNode) {
		for (const attr of currentNode.attributes) {
			if (attr.nodeValue.includes('{{')) {
				addDataSlot(currentNode, attr.nodeValue.replace('{{','').replace('}}',''), attr.name)
			} 
		}	
		currentNode = elemWalker.nextNode()
	}
	let templateStr = processedElem.firstElementChild.outerHTML
	dataSlots.forEach(item=>{
		let str = '{{' + item[0] + '}}'
		templateStr = templateStr.replaceAll(new RegExp(str,'g'),'')

	})
	processedElem.outerHTML = templateStr

	return {processNode:processedElem.firstElementChild, xHtml, dataSlots}
}

const fetchTemplate = (url) => {
	return new Promise((resolve, reject) => {
		// eslint-disable-next-line no-undef
		const xhr = new XMLHttpRequest()
		xhr.open("GET", url)
		xhr.addEventListener('load', () => resolve(xhr.responseText))
		// eslint-disable-next-line unicorn/prefer-add-event-listener
		xhr.onerror = () => reject(xhr.statusText)
		xhr.send()
	})
}

const setReactiveDataNodes = (tplNode) => {
	const place = []
	const getNodeLevel = (node) => {
		let level = 0
		while (node.parentElement) {
			node = node.parentElement
			level++
		}
		return level
	}

	const processReactiveElements = (reactiveElems) => {
		const orderedElems = [...reactiveElems]
			.map((elem) => ({
				elem,
				level: getNodeLevel(elem),
				useParent: elem.dataset.src?.startsWith('this.parent'),
				noRepeat: Object.hasOwn(elem.dataset, 'norepeat'),
			}))
			.sort((a, b) => b.level - a.level)

		orderedElems.forEach(({ elem, level, useParent, noRepeat }, index) => {
			const dataElem = '|STYLE|LINK|'.includes(`|${elem.tagName}|`)
				? elem
				: elem.parentElement &&
				'|DL|UL|TBODY|THEAD|TFOOT|TR|SELECT|SECTION|'.includes(`|${elem.parentElement.tagName}|`)
				? elem.parentElement
				: elem.parentElement // globalThis.document.createElement('data') TODO: add infinite vertical scroll using a data element wrapper

			const parsedNode = dooParse(elem)
			Object.assign(dataElem, {
				processNode: parsedNode.processNode,
				xHtml: parsedNode.xHtml,
				dataSlots: parsedNode.dataSlots,
				name: index,
				level,
				useParent,
				noRepeat,
				isTable: isTable(dataElem),
			})

			if (dataElem.tagName === 'DATA' || dataElem.tagName === 'STYLE' || dataElem.tagName === 'LINK') {
				// eslint-disable-next-line @typescript-eslint/no-unused-expressions
				elem.parentElement?.replaceChild(dataElem, elem) || console.warn('Templates should only have one child node')
			}

			place.push(dataElem)
		})
	}

	const reactiveElems = tplNode.content.querySelectorAll(`[${Config.DATA_BIND}]`)
	reactiveElems.forEach((elem) => {
		if (!Object.hasOwn(elem.dataset, 'src')) {
			elem.dataset.src = tplNode.hasAttribute('doo-dispatch') ? 'DooX' : Config.DATA_BIND
		}
		delete elem.dataset.src
	})

	processReactiveElements(reactiveElems)

	tplNode.place = place
}
		

const prefetchTemplate = async (src) => {
    if (src && (src.startsWith('./') || src.startsWith('../') || src.startsWith('http'))) {
        const tpl = await fetchTemplate(src)
        return tpl
    }
    return null
}

const createTemplate = async (id, data = [], src = null) => {

	let tpl = src ? await prefetchTemplate(src) : ''
    if (!tpl) {
        if (id.startsWith('<')) {
            tpl = id
        } else if (id.startsWith('#')) {
            tpl = globalThis.document.querySelector(id).outerHTML
        } else {
            tpl = globalThis.document.querySelector('#' + id).outerHTML
        }
    }

    const elem = globalThis.document.createElement('div')
    elem.innerHTML = tpl
    if (elem.querySelector('template')) {
        elem.innerHTML = elem.querySelector('template')
            ? tpl
            : `<template><center><pre>The template you are trying to import does not have a &lt;template&gt; tag</pre><div style="color:red">${tpl}</div></center></template>`
    }
    const importedTemplate = cloneDeep(elem.querySelector('template'))

    const templateNode = globalThis.document.createElement('template')
    importedTemplate.removeAttribute('id')
    templateNode.innerHTML = importedTemplate.innerHTML

    setReactiveDataNodes(templateNode)	
    const subscriber = globalThis.document.querySelector(`[data-template="${id}"]`)
	templateNode["place"][0].textContent = ''
	templateNode["place"][0][Config.KEY] = subscriber.dataset[Config.KEY]
    subscriber.parentElement.replaceChild(templateNode.content, subscriber)

    if (data.length > 0) {
		render(templateNode["place"][0], data, 0)
	}	
	
    return templateNode["place"][0]
}
export  {createTemplate, append, appendWithProvider, render, renderWithProvider, Config , version, prefetchTemplate}

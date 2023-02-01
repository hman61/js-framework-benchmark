
export class Doo {
	static get $Doo() { 
		return  {
			instance: {},
			counter:{},
			getNextID: function(name) {
				if (Doo.$Doo.counter[name] === undefined) {
					Doo.$Doo.counter[name] = -1
				}	
				return  name + '_' + (++Doo.$Doo.counter[name]) 
			}
		}
	}
	

	static get version() {return 'v0.90.1'}

	constructor(pageSize=50) {
		Doo.debug = location.href.includes('#debug') || false
		Doo.DAO = DAO
		Doo.util = Util
		this.debug = Doo.debug
		this.initialTime = (new Date().getTime())
		this.PAGE_SIZE = pageSize //TODO make a formula that optimizes JIT (tot size less > 1000 = 50, else 100, block size > 1/3vh 12)
		if (!this.template && this.getAttribute('template')) {
			this.template = this.template || this.getAttribute('template')
		}
		this.filteredData = {}
		this.visibleColumns = []
		this.place = []
		this.scrollPos = 0
		if (this.debug) { console.log(Doo.$Config.NAME + ' ' + Doo.version) }
	}
	dooParse(argDataNode) {
		//TODO remove HTML comments
		//TODO replace {{}} in <code></code> and <pre></pre> with escaped "\{\{" 
		//TODO Allow for nested {{templateRoot{{yyy}}zzz}}
		let tplNode = argDataNode.cloneNode(true)
		tplNode.removeAttribute(Doo.$Config.DATA_BIND)
		//tplNode.removeAttribute('dynamic')
		let htmlStr = tplNode.outerHTML.replace(/\t/g, '').replace(/\n/g, '')
		let orgStr = htmlStr
		//covers checked="false" where browser returns true 
		//TODO: check modern browser to see if it still is an issue
		Doo.xAttr().forEach(item => {
			htmlStr = htmlStr.replace(new RegExp(' ' + item + '="{{(.+)}}"', 'g'), ' doo-' + item + '="{{$1}}"')
		})
		let xHtml = (orgStr === htmlStr)
		if (window[this.constructor.name] === undefined) {
            window[this.constructor.name] = []
		} 
		//TODO bind(this)
		let inst =  window[this.constructor.name].length
		htmlStr = htmlStr.split('="doo.self.').join('="' + this.constructor.name + '[' + inst + '].');
		htmlStr = htmlStr.split('="self.').join('="' + this.constructor.name + '[' + inst + '].');
		//TODO allow key with no value
		// if (this.getAttribute('key')) {
		// 	htmlStr = htmlStr.split(' key ').join(' key="{{ i() }}" ');
		// }	
		let aHTML = htmlStr.split(Doo.$Config.DELIMITER.END)

		let templateArray = []
		let len = aHTML.length
		let aStr

		for (let i=0; i<len; i++) {
			if (Doo.$Config.DELIMITER.BEG.includes(Doo.$Config.DELIMITER.BEG)) {
				aStr =  aHTML[i].split(Doo.$Config.DELIMITER.BEG)
				templateArray.push(aStr[0])	
				templateArray.push(this.getPropertyType(aStr[1]))		
			}	
		} 
		
		return {templateArray,xHtml}
	}


    renderNode(place, data, start = 0, pgSize = this.PAGE_SIZE) {
        let dataLen = data.length
        ,stop = start + pgSize
        ,html = []

        if (stop > dataLen) { stop = dataLen }

        for (let i = start; i<stop; i++) {
            for (let j=0, len = place.templateArray.length; j<len; j=j+2) {
                html.push(place.templateArray[j])

                html.push(this.getItemValue(data[i],place.templateArray[j+1].fld))
            }
        }
        return html.join('')
    }

    getLevel(dataSetElem) {
        let level = 0
        while (dataSetElem.parentElement) {
            dataSetElem = dataSetElem.parentElement
            level++
        }
        return level;
    }

    //TODO
    clearDataFilter(dataSetName) {
        this.filteredData[dataSetName] = undefined
    }

    //TODO make filter criteria object
    //TODO make static filter RecCount and Total RecCount
    //setDataSearchFilter(dataSetName, matchType = Doo.$Config.MATCH.ANY) {
    //}	
    setDataFilter(dataSetName, criteria) {
        
        let filterKey = this.filterKey && this.filterKey.toLowerCase()
        //TODO let data = [...this.data[dataSetName]] insted of slice
        let data               = this.data[dataSetName].slice()
        let me = this
        if (criteria) {
            data = data.filter(criteria)
        } else if (filterKey) {
            filterKey =String(filterKey)
            //TODO set filter only and filter the data during renderNode method
            data = data.filter(row => me.visibleColumns.some(key => String(me.getItemValue(row, key)).toLowerCase().indexOf(filterKey)>-1))
        }
        this.setScrollContainerHeight(data.length)	
        this.filteredData[dataSetName]  = data.slice(0, this.page_size)
    }
    //TODO make promise and 
    // 	async tableTop(key, worksheet) {
        
    // 		let response = await Tabletop.init( {
    // 			key: key,
    // 			wanted: [worksheet]
    // 		})	
    // //		console.log(response[worksheet].elements)

    // 		return response[worksheet].elements
    // 	}			

    async getDataObj(dataSrc, dataSheetKey = null) {
        dataSrc = dataSrc.trim()
        let data, key
        if (dataSrc.indexOf('.csv') > -1) {
            data = await Doo.fetchURL(dataSrc)
            return Doo.DAO.csvToJson(data)
        } else if (dataSheetKey && dataSrc.indexOf('worksheet') >-1 ) {
            let aSrc = dataSrc.split('|') 
            data = await this.tableTop(dataSheetKey, aSrc[1])
            return data
        } else if (dataSrc.indexOf('worksheet') > -1 && dataSrc.indexOf('key') > -1) {
            let aSrc = dataSrc.split('|') 
            let key = aSrc[1]
            let worksheet = aSrc[3]
            data = await this.tableTop(key, worksheet)
            return data
        } else if (dataSrc.indexOf('http') === 0 || dataSrc.indexOf('.json') > 0) {	
            data = await Doo.fetchURL(dataSrc)
            return JSON.parse(data)
        } else if (dataSrc.indexOf('.js') > 0) {  
                // TODO make fetch, dynamic imports are not allowed in es2019 	
                data = await import(`${dataSrc}`)
                return data.default
        } else if (dataSrc.indexOf('{') === 0) {
                return JSON.parse(dataSrc)
        } else if (dataSrc.indexOf('..') === 0 || dataSrc==='this.parent.data') {
            let parentDoo = this.getDooParent() 
            return parentDoo.data
        //TODO move to computed do a common .. splitter that returns a range object
        } else if (dataSrc.indexOf('..') > 0) { 
                let dataRange = dataSrc.replace('[','').replace(']','')
                let range = dataRange.split('..')
                let arr = []
                let isAlpha = isNaN(range[0])
                let start = parseInt(isAlpha ? range[0].charCodeAt(0) : range[0])
                let stop = parseInt(isAlpha ? range[1].charCodeAt(0) : range[1])
                for (let j=start; j<=stop; j++) {
                    arr.push(isAlpha ? String.fromCharCode(j) : j )
                }
                return arr.splice(0)
        } else if (dataSrc.includes('|') || dataSrc.indexOf('[') === 0) {  
                let deli = dataSrc.includes('|') ? '|' : ','			
                let dataKeyValues = dataSrc.replace('[','').replace(']','').split(deli)
                dataKeyValues.forEach(item=>item.trim())
                return dataKeyValues
        } else if (dataSrc.indexOf('window.') === 0 || dataSrc.indexOf('const.') === 0 || dataSrc.indexOf('var.') === 0) { 
                key = dataSrc.split('.')[1].trim() 
                return window[key]
    //		} else if (dataSrc.indexOf('this.') === 0) {
    //			key = dataSrc.split('.')[1]
    //			return this.host[key]
        } else if (!dataSrc.includes(' ') && typeof eval(dataSrc) !== undefined) {
            return eval(dataSrc)
        } else  { 
            console.log('WARNING: ' + dataSrc + ' datasource not scooped properly')	
        }
        return dataSrc
    }	

    async initDataNodes(tplNode) {
        this.dataMap = null
        this.flex = null
        if (this.hasAttribute('data-map')) {
            if (this.getAttribute('data-map').indexOf('Doo.reflect') === 0) {
                this.dataMap = Reflect.ownKeys(Doo.DAO.getData(this.getAttribute(Doo.$Config.DATA_BIND))[0])
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
                return Doo.$Config.DELIMITER.BEG + this.dataMap[p1-1] + Doo.$Config.DELIMITER.END 
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
        let dSrc = tplNode.content.querySelectorAll('[' +  Doo.$Config.DATA_BIND + ']');
        [...dSrc].forEach( reactNode  =>  {
            if (!reactNode.hasAttribute('data-src')) {
                let dataSrc = this.hasAttribute('doo-dispatch') ? 'Doo.DAO' : 'this.data' 
                reactNode.setAttribute('data-src' , dataSrc)
            }	
        })
        let reactiveElems = tplNode.content.querySelectorAll('[data-src]')
        let len = reactiveElems.length
        let i = 0
        let reactiveElem = [], dataElem, dataSet
        for (i=0;i<len;i++) {
            let key = reactiveElems[i].getAttribute(Doo.$Config.DATA_BIND).trim()  
            let dataSrc = reactiveElems[i].getAttribute('data-src').trim()
            if (dataSrc) {
                if (dataSrc === 'Doo.DAO') {
                    this.setAttribute('doo-dispatch', key)
                    dataSet = Doo.DAO.getData(key)
                } else {
                    dataSet = await this.getDataObj(dataSrc, reactiveElems[i] )
                }
                this.data[key] = Array.isArray(dataSet) ? dataSet : dataSet[key]
            } 
            if (dataSrc.indexOf('this.parent') === 0) {
                reactiveElems[i].useParent = true
            }

            reactiveElems[i].removeAttribute('data-src')
            reactiveElems[i].level = this.getLevel(reactiveElems[i])
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
            } else if (reactiveElem[i].parentElement && (reactiveElems[i].getAttribute(Doo.$Config.DATA_BIND) === 'void' ||  '|DL|UL|TBODY|THEAD|TFOOT|TR|SELECT|SECTION|'.indexOf(`|${reactiveElem[i].parentElement.tagName}|`) >-1)) {
                //TODO remove slots or elem with doo-static attribute, and put as first child after render 
                dataElem = reactiveElem[i].parentElement
            } else {
                dataElem = document.createElement('data')	
            }
            dataElem.dataKey = reactiveElem[i].getAttribute(Doo.$Config.DATA_BIND)
            let parsedNode = this.dooParse(reactiveElem[i], this.dataMap)
            dataElem.templateArray = parsedNode.templateArray 	
            dataElem.xHtml = parsedNode.xHtml 	
            dataElem.name = i
            dataElem.level = this.getLevel(reactiveElem[i])
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

    async prepareTemplate() { 
        if (this.debug) console.log('Template:', this.template)
        let tpl = await this.setTemplate(this.template)
        let elem = document.createElement('div')
        elem.innerHTML = tpl
        if (elem.querySelector('template')) {
            //TODO create ERROR slot or Doo.$Config constance
            elem.innerHTML = elem.querySelector('template') ? tpl : `<template><center><pre>The template you are trying to import does not have a &lt;template&gt tag</pre><div style="color:red">${this.template}</div></enter></template>`
        }
        //TODO check for null pointer
        let importedTemplate = elem.querySelector('template').cloneNode(true)
        importedTemplate.removeAttribute('id')

        this.templateNode  = document.createElement('template')
        // TODO probably not used
        let dataDispatch = this.getAttribute('data-dispatch') || 'undefined'
        this.templateNode.innerHTML = importedTemplate.innerHTML.replace(/\${dataDispatch\}/g,dataDispatch)

        // TODO warn when there are multiple children (maybe not needed, not sure)
        /*	if (!this.templateNode.content.parentElement) {
                let tplRootNode = document.createElement('section');
                tplRootNode.innerHTML = this.templateNode.innerHTML
                this.templateNode.innerHTML = tplRootNode.outerHTML
            }
        */
        //TODO implement css="inherit" and use https://developer.mozilla.org/en-US/docs/Web/API/DocumentOrShadowRoot to bring them in

    /*		
        if (!this.shadow && this.getAttribute('css')) {
            let cssList = this.getAttribute('css').split(',')
            let len = cssList.length 
            for (let i=0;i<len;i++) {
                let link = document.createElement('link')
                link.href = cssList[i]
                link.rel = "stylesheet"
                //this.templateNode.content.firstElementChild.parentNode.insertBefore(link, this.templateNode.content.firstElementChild)
                this.templateNode.content.firstElementChild.parentNode.insertBefore(link, this.templateNode.content.firstElementChild)
            }
        }
    */
        this.templateElem = this.templateNode.content

        let styleNode = 	this.templateElem.querySelectorAll('style')
        //TODO support multiple style nodes within the template
        if (styleNode && styleNode.length > 0) {
            this.templateElem.appendChild(styleNode[0])
        }
        if (this.place.length === 0) {
            await this.initDataNodes(this.templateNode)
            if (this.getAttribute('style')) {
                this.templateNode.setAttribute('style', this.getAttribute('style'))
            }
        } 
    }
    async setContext() {
        //TODO tie this to the Doo object and bind it more elegantly
        if (!window[this.constructor.name]) {
            window[this.constructor.name] = []
        }
        window[this.constructor.name].push(this)
        if (this.childNodes.length >0) {
            if (this.getElementsByTagName('template') && this.getElementsByTagName('template').length > 0) {
                this.removeChild(this.getElementsByTagName('template').item(0))
            }	
        }	
        let context = this.getAttribute('context') || Doo.$Config.SHADOW 
        if (context === Doo.$Config.SHADOW) {
            this.shadow.host.style.visibility = 'hidden'
            let currentClasses = this.templateElem.firstElementChild.hasAttribute('class') ? ' ' + this.templateElem.firstElementChild.getAttribute('class') : ''
            let parentClasses = this.hasAttribute('class') ? this.getAttribute('class') + ' ' : ''
            if (parentClasses + currentClasses !== '' && this.templateElem.firstElementChild) {
                this.templateElem.firstElementChild.setAttribute('class', `${parentClasses}${currentClasses}`)
            }

            this.shadow.appendChild(this.templateElem)

            this.componentContainer = this.shadow.host 

        } else if (context === Doo.$Config.DOCUMENT) {
            this.style.visibility = 'hidden'
            let elem = this.parentElement.replaceChild(this.templateElem, this)
            this.componentContainer = elem 
        }	
        this.initialHeight = this.shadow.firstElementChild.offsetHeight
        this.shadow.firstElementChild.setAttribute('data-offset',this.initialHeight)
            
        const cssLoadPromise = new Promise((resolve) => {
            let delay = navigator.userAgent.toUpperCase().includes('FIREFOX') ? 25 : 25
            //let delay = 1 

            let loadCnt = 0
            let loadCheck = setInterval(() => {
                loadCnt++ 
                this.shadow.firstElementChild.setAttribute("data-offset", this.shadow.firstElementChild.offsetHeight)
                let h = parseInt(this.shadow.firstElementChild.getAttribute("data-offset"))
                if (loadCnt > 20  || h !== this.initialHeight) {
                    this.shadow.firstElementChild.removeAttribute("data-offset")
                    if (this.scrollTarget) {
                        this.setScrollHeight()
                    }
                    clearInterval(loadCheck)
                    resolve()		
                }
            }
            , delay);
        })

        await cssLoadPromise
        this.componentContainer.style.visibility = 'visible'	
        this.ready = true
    }		

    async setScrollHeight() {	
        if (this.scrollTarget) {
            this.scrollElem = this.shadow.querySelector(this.scrollTarget)
            if (this.data[this.defaultDataSet] && this.data[this.defaultDataSet].length > this.PAGE_SIZE) {
                this.addScrollWatcher()
            }	
        }			
    }
    getCurrentData(name) {
        return this.getFilteredData(name) ? this.getFilteredData(name) : this.data[name]
    }	

    getItemValueByType(data, i, templateFldObj) {
        switch (templateFldObj.type) {
            case (Doo.$Config.TYPE.DEFAULT): 
            case (Doo.$Config.TYPE.DEEP):
                return this.getItemValue(data[i],templateFldObj.fld)
            case (Doo.$Config.TYPE.COMPUTED):
                // TODO should probably be static for speed
                let dataItem = new Doo.DataItem(data[i], i, data)

                //dataItem.dataSetName = dataElem.dataKey   //TODO TEST
                dataItem.fld = templateFldObj.fld
                dataItem.func = templateFldObj.func
                dataItem.$1 = templateFldObj.$1
                dataItem.$2 = templateFldObj.$2
                dataItem.$3 = templateFldObj.$3
                dataItem.$4 = templateFldObj.$4
                dataItem.$5 = templateFldObj.$5

                dataItem.instance = templateFldObj.instance
                return templateFldObj.func(dataItem)
            case (undefined):
                return ''
        }
    }

    renderTable(dataSet=this.data[this.defaultDataSet],target=this.place[0], start=0) {
        let elem = document.createElement('template'),len = dataSet.length, i = len - 1
        elem.innerHTML = this.renderNode(target, dataSet, start , len - start)
        do {
            target.insertBefore(elem.content.removeChild(elem.content.lastElementChild), target.firstElementChild).key = dataSet[i].id
        } while ( --i >=0)
    }

    append(dataSet=this.data[this.defaultDataSet],target=this.place[0], start=0) {
        let elem = document.createElement('template'),len = dataSet.length
        elem.innerHTML = this.renderNode(target, dataSet, start , len - start)
        for (let i=start;i<len;i++) {
            target.appendChild(elem.content.removeChild(elem.content.firstElementChild)).key = dataSet[i].id
        }
    }

    async render(dataSetName=null, page=0, replaceOrAppendRow=null) {
        if (!this.template) {
            console.log(this.name + ' has no template defined')
            return
        } 
        if (!this.templateNode && !this.ready) {
            await this.prepareTemplate()
        }	
        let startTime = this.debug ? new Date().getTime() : null
        for (let i=0, len=this.place.length;i<len;i++) {
            if (dataSetName && dataSetName !== this.place[i].dataKey) {
                continue   // TODO other for-eachs that are children of the specified data set proably needs to be re-rendered (needs test scenarios)
            }
            if (page === 0 && this.place[i].tagName !== 'STYLE' && !this.place[i].classList.contains('fhead')) {
                let pg = this.place[i].getAttribute(Doo.$Config.DATA_BIND) === 'dummy' ? -1 : 0 
                this.place[i].setAttribute("page", pg);
            }	
            let dataKey = this.getCurrentData(this.place[i].dataKey) 
            this.getFilteredData(this.place[i].dataKey) ? this.getFilteredData(this.place[i].dataKey) : this.data[this.place[i].dataKey]
            let pageSize = this.place[i].noRepeat ? 1 : this.PAGE_SIZE
            if (replaceOrAppendRow === null) {
                if (page > 0 && dataSetName === this.defaultDataSet) {
                    let pagePointer = this.scrollElem.querySelector('data[page="' + page + '"]')
                    //TODO test
                    //let pagePointer = this.scrollElem.querySelector('[page="' + page + '"]')
                    if (!pagePointer) {
                        let tag = this.scrollElem.tagName === 'TABLE' ? 'tbody' : 'data'
                        let newElem = document.createElement(tag)
                        newElem.setAttribute("page", page);
                        newElem.innerHTML = this.renderNode(this.place[i], dataKey,   page * this.PAGE_SIZE, pageSize)
                        if (!this.lastInsertedElem || page > this.lastPage) { 
                            this.place[i].parentElement.appendChild(newElem)
                        } else {
                            this.lastInsertedElem.insertAdjacentElement('beforebegin', newElem)
                        }
                        this.lastInsertedElem = newElem
                    } else {
                        if (pagePointer.innerHTML.length === 0) {
                            pagePointer.innerHTML =  this.renderNode(this.place[i], dataKey,  page * this.PAGE_SIZE, pageSize)
                        }	
                        this.lastInsertedElem = pagePointer
                    }
                    if (this.scrollTarget && this.scrollElem.tagName !== 'TABLE') {
                        this.lastInsertedElem.style.top = (page * this.blockHeight) + 'px'
                        this.lastInsertedElem.style.position = 'absolute'
                    }	
                } else {
                    if (this.place[i].useParent) {
                        this.place[i].innerHTML =  this.renderNode(this.place[i], dataKey, parseInt(this.getAttribute('key')) , 1)
                    } else {	
                        this.place[i].innerHTML =  this.renderNode(this.place[i], dataKey,  page * this.PAGE_SIZE, pageSize)
                    }	
                }	
            } else {
                this.place[i].append(this.renderNode(this.place[i], dataKey,  replaceOrAppendRow, 1))
            }
            if (dataSetName === this.defaultDataSet) {
                this.lastPage = page
            }	
        }		
        //TODO rename 
        if (!this.ready) {
            this.setContext()
        }
        if (this.debug) {
            if (!this.getAttribute('title')) {
                this.setAttribute('title', this.id + ':init() ' + (new Date().getTime() - this.initialTime) + 'ms')
            }
            let renderTime = (new Date().getTime() - startTime) + 'ms'
            this.setAttribute('doo-render-time', renderTime)
            this.setAttribute('title', this.getAttribute('title') + '|' + renderTime)
        }
        return page	
    }

    //TODO rename
    static async fetchURL(url) {
        return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open("GET", url)
        xhr.onload = () => resolve(xhr.responseText)
        xhr.onerror = () => reject(xhr.statusText)
        xhr.send();
        })
    }
    //TODO deprecated
    setHttpRequest(url, callback) {
        let me = this
        let xhr = new XMLHttpRequest();
        xhr.onload = () => { 
            callback(this.responseText, me) 
        }
        xhr.open('GET', url, true)
        xhr.send()
    }

    hasScroll(elem) {
        //TODO set paging
        return (this.getStyle(elem, 'overflow-y') === 'auto' || this.getStyle(elem, 'overflow-y') === 'scroll');
    }	
    getStyle(argElem, cssProperty, psudo = null) {
        if (argElem) {
            return (argElem && argElem.currentStyle) ? argElem.currentStyle[cssProperty] : window.getComputedStyle(argElem, psudo).getPropertyValue(cssProperty); 
        }	
    }
        
    async sortBy(elem, name ) {
        let defaultDataSet = this.defaultDataSet || this.getAttribute(Doo.$Config.DATA_BIND)
        this.lastPage = null
        let dir = elem.getAttribute('sort-dir') || 1
        Doo.util.sortBy(this.getCurrentData(defaultDataSet), name, dir)
        let sortFields = elem.parentElement.querySelectorAll('.doo-sort');
        [...sortFields].forEach(item => { 
            item.classList.remove('dir_1','dir_-1')
        })	
        elem.classList.add((parseInt(dir)*-1 === 1) ? 'dir_-1':'dir_1')
        elem.setAttribute('sort-dir', dir*-1)
        let pg
        if (this.scrollElem) {
            pg = this.scrollElem.querySelectorAll('[page]')
            if (pg) { pg[0].innerHTML = ''}
        }	
        this.lastInsertedElem = null
        this.rendering = true
        await this.render(defaultDataSet, 0)
        this.rendering = false
        if (this.container) {
            this.container.scrollTop = 0
        }
        // TODO call clear
        if (pg && pg.length > 0) {
            for (let k=pg.length-1;k>0;k--) {
                pg[k].remove()
            }	
        }
        // TODO scroll top  
    }
// 	async connectedCallback() {
// 		// let dooBind = document.querySelector('doo-bind')
// 		// if (dooBind && !dooBind.hasAttribute('is-ready')) {
// 		// 	await this.initDooBind(window.isReady)
// 		// }
// 		if (this.hasAttribute('data-set') || this.hasAttribute('data-bind')) {
// 			let name = this.getAttribute('data-set') || this.hasAttribute('data-bind')
// 			if (this.hasAttribute('data-set')) {
// //				this.data[name] = await this.getDataObj(this.getAttribute('data-set'))
// 				this.data[name] = window[name]
//             } else {
//                 // use state
// 				this.setAttribute('doo-dispatch', this.id + '_' + name)
// 				this.data[name] = await Doo.DAO.getData(name)
// 			}
// 		}
// 		this.template = this.getAttribute('template')
// 		if (typeof this.dooAfterRender === 'function') {
// 			await this.dooAfterRender()
// 	    }

// 		super.connectedCallback()
// 	}

	async connectedCallback() {

		let context = this.getAttribute('context') || Doo.$Config.SHADOW 
		this.shadow = context === Doo.$Config.SHADOW ? this.attachShadow({mode: 'open'}) : document
		// if (!this.id && !this.getDooParent()) {
		// 	this.id = Doo.$Doo.getNextID(this.constructor.name)
		// }	
		if (!this.defaultDataSet && this.getAttribute('data-bind')) {
			this.defaultDataSet = this.getAttribute('data-bind')
			//this.scrollTarget = Doo.$Config.FLEX_BODY
		}	
		if (!this.defaultDataSet && this.getAttribute('data-set')) {
			this.defaultDataSet = this.getAttribute('data-set')
			//this.scrollTarget = Doo.$Config.FLEX_BODY
		}	

		if (!Doo.$Doo.instance[this.id]) { 
			Doo.$Doo.instance[this.id] = this
		} 
		if (typeof this.init === 'function') {
			await this.init()
		}
		
		if (this.debug) {
			let tag = this.constructor.name.toLowerCase()
			console.log(`Custom tag added: <doo-${tag} />`)
		}

		await this.render() 

		if (this.scrollTarget) {
			this.scrollElem = this.shadow.querySelector(this.scrollTarget)
		} 

		this.ready = true
        // TODO use effect
		if (typeof this.dooAfterRender === 'function') {
			 await this.dooAfterRender()
		}
	}	



    static define(klass, alias=null) {
		let name = alias || klass.name.toLowerCase()
		customElements.define('doo-' + name, klass)
	}	
}
export class Html extends Doo {
	constructor() {
		super()
		this.data = {}
	}

	async connectedCallback() {
		// let dooBind = document.querySelector('doo-bind')
		// if (dooBind && !dooBind.hasAttribute('is-ready')) {
		// 	await this.initDooBind(window.isReady)
		// }
		if (this.hasAttribute('data-set') || this.hasAttribute('data-bind')) {
			let name = this.getAttribute('bind') || this.getAttribute('bind')
			if (this.hasAttribute('data-src')) {
				this.data[name] = await this.getDataObj(this.getAttribute('data-src'))
			} else {
                // useState
				// this.setAttribute('doo-dispatch', this.id + '_' + name)
				// this.data[name] = await Doo.DAO.getData(name)
			}
		}
		this.template = this.getAttribute('template')
		if (typeof this.dooAfterRender === 'function') {
			await this.dooAfterRender()
	    }

		super.connectedCallback()
	}
}

Doo.define(Html, 'html')
export default Doo
import DOMPurify from "dompurify"

export class DooScroll {
    constructor(scrollTargetClass, pageSize) {
        this.scrollTargetClass = scrollTargetClass
        this.PAGE_SIZE = pageSize
        this.pageSelector = 'page'
        this.lastScrollPos = -1
        this.rendering = false
        this.scrollDir = 0
        this.dataSet = []
    }
    setDataSet(dataSet) {
        this.dataSet = dataSet
    }
    setPageSelector(pageSelector) {
        this.pageSelector = pageSelector
    }
    reset() {
        this.scrollElem.parentElement.scrollTo(0,0)
    }
    initScrollWatcher(forceReset = false) {
        if (this.lastScrollPos === -1 || forceReset === true) {
            this.scrollElem = document.querySelector(this.scrollTargetClass)
            // TODO add mutation watcher to container height
            if (this.scrollElem && this.dataSet.length > this.PAGE_SIZE) {
                this.scrollElem.style.position = 'relative'
                this.container = this.scrollElem.parentElement                
                //TODO Make this bulletproof maybe a curried function
                this.rowHeight = Math.ceil(this.scrollElem.firstElementChild.firstElementChild.offsetHeight)
                //console.log('coolio row-height', this.rowHeight) //TODO check mobile issue
                //this.headerHeight = this.container.firstElementChild.offsetHeight
                this.blockHeight = document.querySelector(this.scrollTargetClass + ' > data').offsetHeight;
                this.lastScrollPos = 0
                this.setScrollContainerHeight(this.dataSet.length)
                this.scrollElem.parentElement.scrollTo(0,0)

            }
        }	
    }
    setScrollContainerHeight(len) {
		this.scrollElem.style.height =  (this.blockHeight/this.PAGE_SIZE * len) + 'px' 
	}	
    getPosition(y) {
        return  y === 0 ? 0 : (y * this.blockHeight)
    }
    scrollToPage() {
        if (this.lastScrollPos > -1 && !this.rendering) {
            this.rendering = true
            let y = parseInt(this.container.scrollTop/this.blockHeight) 
            this.scrollDir = this.container.scrollTop > this.lastScrollPos ? 1 : 0
            if (this.scrollDir === 1) {
                this.rendering = false
                return y === 0 ? [0,1] : [0, y,y+1] 
            } else {
                this.rendering = false
                let pages = [y]
                while (y>1) {
                    pages.unshift(--y)
                }     
                return pages[0] > 0 ? [0, ...pages] : pages
            }   
        }
    }
}

export const getPropertyLabel = (prop, computedMap) => {
    if (computedMap.has(prop) && computedMap.get(prop).label && typeof computedMap.get(prop).label === 'string') {
        return computedMap.get(prop).label
    }
    let label = prop.includes('.') ? prop.substring(prop.lastIndexOf('.')+1) : prop 
    return label.substring(0,1).toUpperCase() + label.substring(1).toLowerCase() 

}

export const getComputedValue = (item, prop, fn=null) => {
    if (fn && typeof fn === 'function') {
        const result = fn(item)
        return typeof result === 'object'
            ? renderToString(result).replace(' data-reactroot=""','')
            : result
    }
    let curValue = item
    try { 
        prop.split('.').forEach(key => curValue = curValue[key])
    } catch(e) {
        console.log('Property not found', prop, JSON.stringify(curValue))
    }
    return curValue
}  

export const getSafeHTML = (row, column, filterValue='') => {
    
    const _getItemValue = (row, column) => {
        if (column.fn && typeof column.fn === 'function') {
            const result = column.fn(row)
            return typeof result === 'object'
                ? renderToString(result).replace(' data-reactroot=""','')
                : result
        }
        let curValue = row
        try { 
            column.fld.split('.').forEach(key => curValue = curValue[key])
        } catch(e) {
            console.log('Property not found', column.fld, JSON.stringify(curValue))
        }
        return curValue
    }  
    
    const _highlight = (column, val, filterValue='') => {
        let retVal
        if (column.no_search === true || !filterValue.length || !val  || val.toString().includes('<img') || val.toString().includes('background-image')) {
            return val
        } else {    
            let re = new RegExp(filterValue, "ig")
            retVal = val.toString().replace(/&amp;/gi,'&')
            //TODO make <b> configurable
            if (!column.no_search) {
                retVal = retVal.replace(re, txt => `<b class="doo-find">${txt}</b>`)
            }
        }    
        return DOMPurify.sanitize(retVal)
      }
    
    const _createMarkup = (column, innerHtml, filterValue) => {  return {__html: _highlight(column, innerHtml, filterValue)} }

    return _createMarkup(column, _getItemValue(row, column), filterValue)
}

export const getStyle = (argElem, cssProperty, psudo = null) => {
    return (argElem.currentStyle) ? argElem.currentStyle[cssProperty] : window.getComputedStyle(argElem, psudo).getPropertyValue(cssProperty); 
}

export const dooSortBy = (data, argSortArray, argDirection) => {
    if (data.length < 1) { 
        return;	
    }

    const comparator = {

        'getValue':
        (item, prop ) => {
            let aProp = prop.split('.');
            let curValue = item;
            for (let j=0;j<aProp.length;j++) {
                curValue = curValue[aProp[j]];
            }
            return curValue;
        },  

        'getDataType':
        function(argFld, argArray) {
            if (typeof argFld === 'object') { return 'byFunc'; }
            
            let val = comparator.getValue(argArray[0],argFld);
    
            if (val && val.toString().indexOf("/") > 0 && new Date(val) && !isNaN(new Date(val).getTime())) {return 'byDate'; }
            for (let i=0; i<argArray.length; i++) {
                if (isNaN(comparator.getValue(argArray[i],argFld))) {
                    return 'byString';  
                }
            }
            return 'byNumber';
        },

        'byFunc':
        function(a, b, obj, i) {
            let fn = obj[i].cmd;
            let fa = fn.call(this, (obj[i].dir === -1 ? b : a), obj[i].param, argDirection );
            let fb = fn.call(this, (obj[i].dir === -1 ? a : b), obj[i].param, argDirection );
            if  (fa < fb) {return -1;}
            if  (fa > fb) {return 1;}
            return (typeof obj[i+1] != 'undefined') ? comparator[obj[i+1].type](a,b, obj, i+1) : (a.$_id - b.$_id);
        },       

        'byDate':
        function(a, b, obj, i) {
            let fld = obj[i].fld.replace('{','').replace('}','')
            let da = comparator.getValue((obj[i].dir === -1 ? b : a),fld);
            let db = comparator.getValue((obj[i].dir === -1 ? a : b),fld);
            if (!da.getTime && !db.getTime) {
                da = new Date(da);
                db = new Date(db);
            }
            da = da.getTime();
            db = db.getTime();
            if  (da < db) {return -1;}
            if  (da > db) {return 1;}                   
            return (typeof obj[i+1] != 'undefined') ? comparator[obj[i+1].type](a,b, obj, i+1) : (a.$_id - b.$_id);
            },

        'byString':
        function(a, b, obj, i) {
            let fld = obj[i].fld.replace('{','').replace('}','')
            let sa = comparator.getValue(obj[i].dir === -1 ? b : a, fld)  
            let sb = comparator.getValue(obj[i].dir === -1 ? a : b, fld)  
            try {
                sa = !sa || typeof sa !== 'string' ? '' :  sa.toUpperCase()
                sb = !sb || typeof sb !== 'string' ? '' :  sb.toUpperCase()
            } catch(e) {
                console.log('An error occured sorting by String', e, sa,sb,a,b)
            }	
            if  (sa < sb) {return -1;}
            if  (sa > sb) {return 1;}
            return (typeof obj[i+1] != 'undefined') ? comparator[obj[i+1].type](a,b, obj, i+1) : (a.$_id - b.$_id);

        },

        'byNumber':
        function(a, b, obj, i) {
            let fld = obj[i].fld.replace('{','').replace('}','')
            let na = Number(comparator.getValue((obj[i].dir === -1 ? b : a),fld));
            let nb = Number(comparator.getValue((obj[i].dir === -1 ? a : b),fld));
            if  (na < nb) {return -1;}
            if  (na > nb) {return 1;}
            return (typeof obj[i+1] != 'undefined') ? comparator[obj[i+1].type](a,b, obj, i+1) : (a.$_id - b.$_id);
        }
    };
    let sortObjects = [];
    if (typeof argSortArray === 'string') {
        argSortArray = 	argSortArray.replace('{{','').replace('}}', '')
        argSortArray = [argSortArray, argDirection || 1];
    }
    
    if (argSortArray) {
        for (let k=0;k<argSortArray.length;k=k+2) {
            sortObjects.push({'fld' : argSortArray[k],
                             'dir' : Number((argSortArray[k+1] || 1)),
                             'type' :comparator.getDataType(argSortArray[k], data)
                             }                                    
            );
        }
    }
    // TODO to guarantee that the order stays the same when toggle sort when equal
    // TODO should only do this one time
    if (data.length > 0 && typeof data[0].$_id === undefined) {

        for (let n=0,len = data.length ;n<len;n++) {
            data[n].$_id = Number(n);
        }

    }
    try {
        data.sort(function(a,b) {return comparator[sortObjects[0].type](a, b, sortObjects, 0)});
    } catch (e) {
        console.log('An error occured sorting the data set', e, sortObjects, 'orderBy:',  argSortArray)

    }    
}

const curTop = (obj, argIsAbsolute) => {
    let mTop = 0;
    if (obj.offsetParent) {
        while (obj) {
            mTop += obj.offsetTop;
            if (argIsAbsolute && this.getStyle(obj, 'position') === 'absolute') {
                break;
            }
            obj = obj.offsetParent;
        }
    } else if (obj.y) {
        mTop += obj.y;
    }
    return mTop;
}
export const columnMap = (row, columns, filterVal) => {
    let props = new Map()
    for (const item of columns) {
        props.set(item.fld, getSafeHTML(row,item.fld, item.fn, filterVal))
    }
    return props 
}
export  const getItemValue = (item, prop, fn=null) => {
    if (fn && typeof fn === 'function') {
      return fn(item)
    }
    let curValue = item
    try { 
      prop.split('.').forEach(key => curValue = curValue[key])
    } catch(e) {
      console.log('Property not found', prop, JSON.stringify(curValue))
    }
    return curValue
}  

export const renderTable  = (dataSet,target, start=0) => {

	// const _highlight = (val, filterVal) => {
	// 	let filterKey = filterVal && filterVal.toLowerCase()
	// 	if (!filterKey || !val) {return val}
	// 	let re = new RegExp(filterKey, "ig")
	// 	let value = val.toString().replace(/&amp;/gi,'&')
	// 	//TODO make <b> configurable
	// 	return value.replace(re, txt => `<b class="doo-find">${txt}</b>`)
	// }



	const _getItemValue = (item, prop) => {
		if (typeof prop === 'function') {
//			return _highlight(this[prop](item))
			return this[prop](item)
		}
		let curValue = item
		try { 
			prop.split('.').forEach(key => curValue = curValue[key])
		} catch(e) {
			console.log('Property not found', prop, JSON.stringify(curValue))
		}
		return curValue
		//return _highlight(curValue)
	}



    const _renderNode = (place, data, start = 0, pgSize = 3) => {
        console.log('Roolio', place, data)
        let dataLen = data.length
        ,stop = start + pgSize
        ,html = []

        if (stop > dataLen) { stop = dataLen }
        for (let i = start; i<stop; i++) {
            for (let j=0, len = place.templateArray.length; j<len; j=j+2) {
                html.push(place.templateArray[j])
                if (place.templateArray[j+1] && place.templateArray[j+1].fld) {
                    html.push(_getItemValue(data[i],place.templateArray[j+1].fld))
                }    
            }
        }
        return html.join('')
    }
 







    let elem = document.createElement('template'),len = dataSet.length //, i = len - 1
    elem.innerHTML = _renderNode(target, dataSet, start , len - start)
    //return elem.content
        do {
            target.insertBefore(elem.content.removeChild(elem.content.lastElementChild), target.firstElementChild).key = dataSet[i].id
        } while ( --i >=0)
    }
export const render = (dataSetName=null, page=0, replaceOrAppendRow=null) => {
    if (!this.template) {
        console.log(this.name + ' has no template defined')
        return
    } 
    if (!this.place) {
        console.log('No target set on the component or inside the template. USAGE: set the bind=dataKey or data-src=data-key')
    }
    for (let i=0, len=this.place.length;i<len;i++) {
        if (dataSetName && dataSetName !== this.place[i].dataKey) {
            continue   // TODO other for-eachs that are children of the specified data set proably needs to be re-rendered (needs test scenarios)
        }
        if (page === 0 && this.place[i].tagName !== 'STYLE' && !this.place[i].classList.contains('fhead')) {
            let pg = this.place[i].getAttribute(Doo.$Config.DATA_BIND) === 'dummy' ? -1 : 0 
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
    //TODO rename 
    return page	
}


export default {
    DooScroll, 
    getPropertyLabel, 
    getComputedValue, 
    getSafeHTML,
    dooSortBy,
    curTop,
    getStyle,
    columnMap,
    getItemValue,
    renderTable,
    render

} 
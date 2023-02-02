export const DooX = {
    'dataSet':{},
    'setData': 
    function(name, dataSet, instanceName = null) {
        name = this.getDataSetName(name)
        this.dataSet[name] = dataSet
        this.dispatch(name)

    },
    'getData':
    function(name)  {	
        name = this.getDataSetName(name)
        return this.dataSet[name]
    },		
    'getDataSetName':
    function(name)  {
        if (!name) {
            console.log('No dataSet name specified.')
            return null
        } else {	
            if (!this.dataSet[name]) {
                this.dataSet[name] = []
            }
        }	
        return name
    },	
    'prepend':
    function(name, obj) {
        name = this.getDataSetName(name)	
        this.append(name, obj, true)
    },	
    
    'append':
    async function(name, obj, top = null) {
        //TODO this can all be done with splice
        if (Array.isArray(obj)) {
            this.dataSet[name] = top ? obj.concat(Doo.DAO.getData(name)) : Doo.DAO.getData(name).concat(obj) 
        } else {
            name = this.getDataSetName(name) 
            // if (!this.dataSet[name]) {
            // 	this.dataSet[name] = []
            // }
            if (top) {
                Doo.DAO.getData(name).splice(0, 0, obj) 
            } else {
                Doo.DAO.getData(name).push(obj)
            } 	
        }
        this.refresh(name)
    },
    'update':
    function(name, obj, idx) {
        name = this.getDataSetName(name)	
        Doo.DAO.getData(name).splice(idx,1,obj)
        this.refresh(name)
    },

	'deleteNode': (dataSetName, elem) => {
		do  {
			elem = elem.parentElement
		} while (elem.dataset.bind !== dataSetName)
        // TODO don't try runing while previousSibling instead
		let idx =  DooX.getData(dataSetName).findIndex((item, i) => {
            if (item.id == elem.id) return i  // important do not use ===
        })
        if (idx > -1) {
            DooX.remove(dataSetName, idx, false)
            elem.parentElement.removeChild(elem)
        }    
	},

    'remove': 
    function(name, idx, re_render=true) {
        name = this.getDataSetName(name)	
        this.getData(name).splice(idx,1)
        if (re_render === true) {
            this.dispatch(name)
        }
    },
    'dispatch':
    async function(name, doc = document) {
        const subscriber = doc.querySelectorAll("[data-src='" + name +"']")
        for (let i=0, len=subscriber.length; i<len; i++) {
            subscriber.item(i).render(this.dataSet[name])

        }
    },

    'refresh':
    async function(name, doc = document) {
//        const subscriber = doc.querySelectorAll("[doo-dispatch='" + name +"']")
        const subscriber = doc.querySelectorAll("[doo-dispatch='" + name +"']")
        for (let i=0, len=subscriber.length; i<len; i++) {
            subscriber[i].setAttribute('doo-refresh', new Date().getTime())
            await subscriber.item(i).render()
        }
    },

    'refreshOld':
    async function(name, doc = document) {
//        const subscriber = doc.querySelectorAll("[doo-dispatch='" + name +"']")
        const subscriber = doc.querySelectorAll("[doo-dispatch='" + name +"']")
        for (let i=0, len=subscriber.length; i<len; i++) {
            subscriber[i].setAttribute('doo-refresh', new Date().getTime())
            await subscriber.item(i).render()
        }
    },


    'csvToJson':
    function(csvText) {
        let rows = csvText.split("\n")
        let data = []
        if (rows !== undefined) {
            let rowsLen = rows.length
            let fieldDesc = rows[0].replace(/\r/g, '')
            let cols = fieldDesc.split(",")
            let colLen = cols.length

            if (rows.length > 1) {
                let re = new RegExp('(,)(?=(?:[^"]|"[^"]*")*$)','g')
                for (let i=1;i<rowsLen-1;i++) {
                    let obj={}
                    let rowStr = rows[i].replace(re, '|^|') + '|^|'	
                    let row = rowStr.split('|^|')
                    for (let j=0;j<colLen;j++) {
                        obj[cols[j]] = (row[j]) ? row[j].replace(/"/g, '').trim() : ''
                    }	
                    data.push(obj)
                }	
            }
        }
        return data
    }
}
export default DooX
const Util = {
	'getStyle': (argElem, cssProperty, psudo = null) => {
		return (argElem.currentStyle) ? argElem.currentStyle[cssProperty] : window.getComputedStyle(argElem, psudo).getPropertyValue(cssProperty); 
	},
	'sortBy':(data, argSortArray, argDirection) => {
		if (data.length < 1) { 
			return;	
		}

		const comparator = {

			'getValue':
			(item, prop ) => {
				var aProp = prop.split('.');
				var curValue = item;
				for (var j=0;j<aProp.length;j++) {
					curValue = curValue[aProp[j]];
				}
				return curValue;
			},  

			'getDataType':
			function(argFld, argArray) {
				if (typeof argFld === 'object') { return 'byFunc'; }
				
				var val = comparator.getValue(argArray[0],argFld);
		
				if (val && val.toString().indexOf("/") > 0 && new Date(val) && !isNaN(new Date(val).getTime())) {return 'byDate'; }
				for (var i=0; i<argArray.length; i++) {
					if (isNaN(comparator.getValue(argArray[i],argFld))) {
						return 'byString';  
					}
				}
				return 'byNumber';
			},

			'byFunc':
			function(a, b, obj, i) {
				var fn = obj[i].cmd;
				var fa = fn.call(this, (obj[i].dir === -1 ? b : a), obj[i].param, argDirection );
				var fb = fn.call(this, (obj[i].dir === -1 ? a : b), obj[i].param, argDirection );
				if  (fa < fb) {return -1;}
				if  (fa > fb) {return 1;}
				return (typeof obj[i+1] != 'undefined') ? comparator[obj[i+1].type](a,b, obj, i+1) : (a.$_id - b.$_id);
			},       

			'byDate':
			function(a, b, obj, i) {
				var fld = obj[i].fld.replace(Doo.$Config.DELIMITER.BEG,'').replace(Doo.$Config.DELIMITER.END,'')
				var da = comparator.getValue((obj[i].dir === -1 ? b : a),fld);
				var db = comparator.getValue((obj[i].dir === -1 ? a : b),fld);
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
				var fld = obj[i].fld.replace(Doo.$Config.DELIMITER.BEG,'').replace(Doo.$Config.DELIMITER.END,'')
				var sa = comparator.getValue(obj[i].dir === -1 ? b : a, fld).toUpperCase()
				var sb = comparator.getValue(obj[i].dir === -1 ? a : b, fld).toUpperCase()
				if  (sa < sb) {return -1;}
				if  (sa > sb) {return 1;}
				return (typeof obj[i+1] != 'undefined') ? comparator[obj[i+1].type](a,b, obj, i+1) : (a.$_id - b.$_id);

			},

			'byNumber':
			function(a, b, obj, i) {
				var fld = obj[i].fld.replace(Doo.$Config.DELIMITER.BEG,'').replace(Doo.$Config.DELIMITER.END,'')
				var na = Number(comparator.getValue((obj[i].dir === -1 ? b : a),fld));
				var nb = Number(comparator.getValue((obj[i].dir === -1 ? a : b),fld));
				if  (na < nb) {return -1;}
				if  (na > nb) {return 1;}
				return (typeof obj[i+1] != 'undefined') ? comparator[obj[i+1].type](a,b, obj, i+1) : (a.$_id - b.$_id);
			}
		};
		var sortObjects = [];
		if (typeof argSortArray === 'string') {
			argSortArray = 	argSortArray.replace('{{','').replace('}}', '')
			argSortArray = [argSortArray, argDirection || 1];
		}
		
		if (argSortArray) {
			for (var k=0;k<argSortArray.length;k=k+2) {
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
			Timer.start('makeids')

			for (let n=0,len = data.length ;n<len;n++) {
				data[n].$_id = Number(n);
			}
			Timer.stop('makeids',true)

		}
		data.sort(function(a,b) {return comparator[sortObjects[0].type](a, b, sortObjects, 0)});
	},

	'curTop': (obj, argIsAbsolute) => {
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
}
export default Util
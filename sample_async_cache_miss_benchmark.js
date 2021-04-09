"use strict";
// number of asynchronous accessors(1000 here) need to be equal to or less than cache size(1000 here) or it makes a temporary dead-lock that slows down the execution
let Lru = require("./lrucache.js").Lru;

let cache = new Lru(1000, async function(key,callback){
	// cache-miss data-load algorithm
	setTimeout(function(){
		callback(key+" processed");
	},1000);
},1000 /* cache element lifetime */);

let ctr = 0;
let t1 = Date.now();
for(let i=0;i<1000;i++)
{
	cache.get(i,function(data){ 
		console.log("data:"+data+" key:"+i);
		if(i.toString()+" processed" !== data)
		{
			console.log("error: wrong key-data mapping.");

		}
		if(++ctr === 1000)
		{
			console.log("benchmark: "+(Date.now()-t1)+" miliseconds");
		}
	});
}

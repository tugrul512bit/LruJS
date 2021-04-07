"use strict";
/* benchmark 1000 milisecond item loading asynchronously for 1000 times, in 1100 miliseconds */
let Lru = require("./lrucache.js").Lru;
let fs = require("fs");
let path = require("path");

let cache = new Lru(500, async function(key,callback){
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
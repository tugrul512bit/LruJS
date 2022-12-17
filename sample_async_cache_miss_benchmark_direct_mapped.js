"use strict";
// number of asynchronous accessors need to be equal to or less than cache size (512 here) or it makes a temporary dead-lock that slows down the execution a bit
let DirectMapped = require("./lrucache.js").DirectMapped;

// size has to be 2^x
let cache = new DirectMapped(512, async function(key,callback){
	// cache-miss data-load algorithm
	setTimeout(function(){
		callback(key+" processed");
	},1000);
});

let ctr = 0;
let t1 = Date.now();
// please note that ordering of asynchronous results depends on the JS engine, 2999th element could be completed before 1133rd element
// 		(when number of asynchronous accesses > cache_size)
// sample: trying 3000 asynchronous get requests on a cache of size 512 will result in ~6 waves of requests completed (each wave around 1000 milliseconds as the simulation uses setTimeout, expect mixed result order)
for(let i=0;i<3000;i++)
{
	cache.get(i,function(data){ 
		console.log("data:"+data+" key:"+i);
		if(i.toString()+" processed" !== data)
		{
			console.log("error: wrong key-data mapping.");

		}
		if(++ctr === 3000)
		{
			console.log("benchmark: "+(Date.now()-t1)+" miliseconds (if it was serial cache, total time would be ~50 minutes)");
		}
	});
}

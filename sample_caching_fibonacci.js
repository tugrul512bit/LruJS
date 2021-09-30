'use strict';


let Lru = require("./lrucache.js").Lru;
let num_cache_elements = 100;
let element_life_time_miliseconds = 100.0;
let store = {"0":BigInt("0"),"1":BigInt("1"),"2":BigInt("1")};

let cache = new Lru(num_cache_elements, async function(key,callback){	
		callback(store[key]);	
}, element_life_time_miliseconds, async function(key,value,callback){
		
		store[key]=value;
		callback();
});

async function fibonacciCache(n){
	let result = await cache.getAwaitable(n); 
	if(result == undefined)
	{
		let v1 = await fibonacciCache(n-1);
		let v2 = await fibonacciCache(n-2);
		await cache.setAwaitable(n,v1+v2);
		return v1+v2;
	}
	else
	{
		return result;
	}
}

async function benchmark(){	
	for(let i=1200;i>1190;i--)
	{	
		let t = Date.now();
		console.log("fibonacci("+i+")="+await fibonacciCache(i)+"  ------------>  "+(Date.now()-t)+"ms");
		
	}

}

benchmark();

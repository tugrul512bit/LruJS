Uses (any type)[https://github.com/tugrul512bit/LruJS/wiki/Types-of-Keys] as key, stores any data. Caching algorithm is CLOCK version of LRU(approximation) with two hands (1 hand = second chance, 1 hand = eviction).

- Cache-hit: O(1) time complexity, garbage-collection friendly (no node movement, just assignment of values)
- Cache-miss: O(1) time complexity, asynchronous (1000 async cache misses with 1000ms latency = ~1100ms total latency)

Wiki: https://github.com/tugrul512bit/LruJS/wiki

Easy to use:

```JavaScript
"use strict"

// user's functions to access some slow storage
let simulated_backing_store = { "some_key_string":5,"3":1,"4":2,"5":3,"key_test":4,"another_key_string":10 };
function read_from_backing_storage(key,callback){
	setTimeout(()=>	callback(simulated_backing_store[key]),1000);
}

function write_to_backing_store(key,value,callback){
	setTimeout(()=>{
		simulated_backing_store[key]=value;
		callback();
	},1000);
}

// LRU cache
let Lru = require("./lrucache.js").Lru;
let num_cache_elements = 1000;
let element_life_time_miliseconds = 1000;

let cache = new Lru(num_cache_elements, async function(key,callback){
	// backing-store read
	// cache-miss
	// async
  	read_from_backing_storage(key,function(value){
		callback(value); // don't forget to call this at end
  	}); 
}, element_life_time_miliseconds, async function(key,value,callback){

	// backing-store update
	// write-miss
	// async
	write_to_backing_store(key,value,function(){
    		callback(); // don't forget to call this at end
  	});
	
});

// get single data
// asynchronous!
cache.get("some_key_string",function(data){
    console.log("get: "+data);
});

// set single data
// async
cache.set("some_key_string",{ foo:"bar" },function(data){
	console.log("set: "+data.foo);
});

// cached value needs to be updated?
cache.reloadKey("some_key_string"); // postpones the eviction/updating to the cache-miss for overlapping with other cache-misses

// need multiple data at once without callback-hell?
// asynchronous!
cache.getMultiple(function(results){ console.log(results); },"some_key_string","another_key_string",3,4,5,"key_test");



```
Number of "asynchronous" accessors (or number of asynchronous cache-misses) need to be equal to or less than cache size. Otherwise a temporary dead-lock occurs and is solved at a slower performance than non-dead-lock, it is negligible latency if happens rarely.

If a key is not accessed for ```element_life_time_miliseconds``` amount of miliseconds, a cache-miss occurs during next access. Any access before this time is serviced from RAM.

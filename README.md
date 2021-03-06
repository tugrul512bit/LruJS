This asynchronous LRU cache uses ![any type](https://github.com/tugrul512bit/LruJS/wiki/Types-of-Keys) as keys any values. Caching algorithm is CLOCK version of LRU with two hands (1 hand = second chance, 1 hand = eviction).

- Cache-hit: O(1) time complexity, this is the only serial operation
- Cache-miss: O(1) time complexity, asynchronous (1000s of async cache misses with 1000ms latency = ~1100ms total latency)
- Read-caching & write-caching: garbage-collection friendly (just assignment on circular buffer, zero node movement)
- Multiple keys reading/writing: asynchronous between each other and asynchronous to the caller (has Promise versions too for awaitability)
- Passive caching, no extra scheduled tasks (other than reordering the operations in-flight), no extra processes. Only works whenever cache is accessed by get/set methods.

Wiki: https://github.com/tugrul512bit/LruJS/wiki

File caching example:

```JavaScript
"use strict"

// backing-store
var fs = require("fs");

// LRU cache
let Lru = require("./lrucache.js").Lru;
let num_cache_elements = 950;
let element_life_time_miliseconds = 10000;

let cache = new Lru(num_cache_elements, async function(key,callback){

        // cache read miss 
	fs.readFile(key, function(err, buf) {
		if (err) console.log(err);
	  	callback(buf.toString());
	});
}, element_life_time_miliseconds, async function(key,value,callback){

        // cache write miss
	fs.writeFile(key, value, (err) => {
	 	 if (err) console.log(err);
	  	 callback();
	});
});

// only interact with cache, all cache misses are 
// automatically projected to the backing-store
cache.get("./README.md",async function(data){

	// clone readme contents as another file
	cache.set("./newfile.txt",data,async function(data){

		// any write-cached data is flushed to HDD before the application ends
		cache.flush(function(){});
	});
});
```
Number of "asynchronous" accessors (or number of asynchronous cache-misses) need to be equal to or less than cache size. Otherwise a temporary dead-lock occurs and is solved at a slower performance than non-dead-lock, it is negligible latency if happens rarely.

If a key is not accessed for ```element_life_time_miliseconds``` amount of miliseconds, a cache-miss occurs during next access. Any access before this time is serviced from RAM.

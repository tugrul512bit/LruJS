Uses string as key, stores any data. Caching algorithm is CLOCK version of LRU(approximation) with two hands (1 hand = second chance, 1 hand = eviction).

O(1) cache-hit time complexity 
O(1) cache-miss time complexity
So that having thousands of cache elements do not slow-down the access. 

Works with asynchronous cache-miss methods given by user too.

Easy to use:

```JavaScript
let Lru = require("./lrucache.js").Lru;
let num_cache_elements = 1000;
let element_life_time_miliseconds = 1000;
let cache = new Lru(num_cache_elements, async function(key,callback){
  // datastore access for filling the missing cache element when user access key
  callback(some_time_taking_io_work_or_heavy_computation(key)); 
}, element_life_time_miliseconds);


cache.get("some_key_string",function(data){
    // data comes from datastore or RAM depending on its lifetime left or the key acceess pattern
    // do_something_with(data);
});
```

If a key is not accessed for ```element_life_time_miliseconds``` amount of miliseconds, next time the key is accessed a cache-miss occurs. Any access before this time is serviced from RAM.

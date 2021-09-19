Uses string/integer as key, stores any data. Caching algorithm is CLOCK version of LRU(approximation) with two hands (1 hand = second chance, 1 hand = eviction).

- Cache-hit: O(1) time complexity, garbage-collection friendly (no node movement, just assignment of values)
- Cache-miss: O(1) time complexity, asynchronous (1000 async cache misses with 1000ms latency = ~1100ms total latency)

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
    
    // cached value needs to be updated?
    cache.reloadKey("some_key_string"); // postpones the updating to the cache-miss for overlapping with other cache-misses
    cache.get("some_key_string",function(newData){ /* use new data */ }); // new value by key is reloaded from backing store
});
```
Number of "asynchronous" accessors (or number of asynchronous cache-misses) need to be equal to or less than cache size. Otherwise a temporary dead-lock occurs and is solved at a slower performance than non-dead-lock, it is negligible latency if happens rarely.

If a key is not accessed for ```element_life_time_miliseconds``` amount of miliseconds, a cache-miss occurs during next access. Any access before this time is serviced from RAM.

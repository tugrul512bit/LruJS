'use strict';

let read_and_write_on_same_cache = false;

let N = 10;
let backing_store = [];
let backing_store2 = [];


for(let y=0;y<N;y++)
{
	backing_store.push([]);
	backing_store2.push([]);
	for(let x=0;x<N;x++)
	{
		let r = Math.sqrt( (x-N/2) * (x-N/2) + (y-N/2) * (y-N/2) ); // pixel value depending on distance to center of circle
		backing_store[y].push(r);
		backing_store2[y].push(0);
	}
}
let cache_hit_and_miss = 0;
let cache_misses = 0;
let cache_write_misses = 0;

// let Lru = require("./lrucache.js").Lru; ==> Lru constructor requires an extra parameter between read-miss & write-miss functions for life-time management per item
// direct mapped cache only for unsigned integer keys and doesn't have life-time management for performance but has worse cache-hit pattern than Lru but helps if used as L1 cache in front of Lru
// (when Lru is used as client )
let DirectMapped = require("./lrucache.js").DirectMapped;
 


let num_cache_elements = 512;
let element_life_time_miliseconds = 0;

let cache = new DirectMapped(num_cache_elements, async function(key,callback){	
	cache_misses++;


	let x = key%N;
	let y = parseInt(key/N); // floating-point indexing is not allowed for arrays
	
	// simulating slow access to a backing store (will be hidden by async access anyway)
	setTimeout(function(){

		// send the result to a RAM slot in the cache
		callback(backing_store[y][x]);
	},10);

},  async function(key,value,callback){
	cache_write_misses++;	
	let x = key%N;
	let y = parseInt(key/N);
	// simulating slow access to a backing store (will be hidden by async access anyway)
	setTimeout(function(){

		// send the result to a RAM slot in the cache
		backing_store[y][x]=value;
		callback();
	},10);

});


let cache2 = new DirectMapped(num_cache_elements, async function(key,callback){	
	cache_misses++;

	let x = key%N;
	let y = parseInt(key/N);

	// simulating slow access to a backing store (will be hidden by async access anyway)
	setTimeout(function(){

		// send the result to a RAM slot in the cache
		callback(backing_store2[y][x]);
	},100);

},  async function(key,value,callback){
	cache_write_misses++;
	
	let x = key%N;
	let y = parseInt(key/N);

	// simulating slow access to a backing store (will be hidden by async access anyway)
	setTimeout(function(){

		// send the result to a RAM slot in the cache
		backing_store2[y][x]=value;
		callback();
	},100);

});

console.log("cache size = "+num_cache_elements+" pixels");
console.log("image size = "+(N*N)+" pixels");
// image softening algorithm
async function benchmark()
{
	let timing = Date.now();
	for(let y=1;y<N-1;y++)
	{
		for(let x=1;x<N-1;x++)
		{
			
			cache_hit_and_miss += 6; // 5 pixels requested for read, 1 for write
			
			
			let softened_pixel = (await cache.getMultipleAwaitable(	x+y*N, // center pixel
										x+y*N-N, // neighbor up
										x+y*N+N, // neighbor down 
										x+y*N-1, // neighbor left
										x+y*N+1  // neighbor right
			)).reduce((e1,e2)=>{return e1+e2;})/5.0;

			let target = 0;
			if(read_and_write_on_same_cache)
				target = cache;
			else
				target = cache2;

			target.set(x+y*N,softened_pixel,async function(val){
				
				if(y==N-2 && x == N-2)
				{ let dn = Date.now();
					// write all edited data to backing-store and read all non-read data from backing-store
					target.flush(function(){
						console.log("softened image pixels: ");
						console.log(read_and_write_on_same_cache?backing_store:backing_store2);
						console.log("run-time: "+(dn - timing)+" ms          "+((N-2)*(N-2)*5)+" reads "+((N-2)*(N-2))+" writes");
						console.log("cache read hit ratio="+(100*(cache_hit_and_miss - cache_misses)/cache_hit_and_miss));
						console.log("cache write hit ratio="+(100*(cache_hit_and_miss - cache_write_misses)/cache_hit_and_miss));
					});
				}
			});
	
		}
	}
}

benchmark();

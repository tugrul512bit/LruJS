'use strict';

let N = 10;
let backing_store = [];
for(let y=0;y<N;y++)
{
	for(let x=0;x<N;x++)
	{
		let r = Math.sqrt( (x-N/2) * (x-N/2) + (y-N/2) * (y-N/2) ); // pixel value depending on distance to center of circle
		backing_store.push(r);
	}
}
let cache_hit_and_miss = 0;
let cache_misses = 0;
let Lru = require("./lrucache.js").Lru;
let num_cache_elements = 25;
let element_life_time_miliseconds = 1000;
let cache = new Lru(num_cache_elements, async function(key,callback){	
	cache_misses++;

	let obj = JSON.parse(key);
	let x = obj.x;
	let y = obj.y;

	// simulating slow access to a backing store (will be hidden by async access anyway)
	setTimeout(function(){

		// send the result to a RAM slot in the cache
		callback(backing_store[x + y*N]);
	},1000);

}, 100000);
console.log("cache size = "+num_cache_elements+" pixels");
console.log("image size = "+(N*N)+" pixels");
// image softening algorithm
async function benchmark()
{
	for(let y=1;y<N-1;y++)
	{
		for(let x=1;x<N-1;x++)
		{
			let timing = Date.now();
			cache_hit_and_miss += 5; // 5 pixels requested
			let softened_pixel = (await cache.getMultipleAwaitable(	JSON.stringify({x:x,y:y}), // center pixel
										JSON.stringify({x:x,y:y-1}), // neighbor up
										JSON.stringify({x:x,y:y+1}), // neighbor down 
										JSON.stringify({x:x-1,y:y}), // neighbor left
										JSON.stringify({x:x+1,y:y})  // neighbor right
			)).reduce((e1,e2)=>{return e1+e2;})/5.0;
			console.log("("+x+","+y+") softened pixel value: "+softened_pixel+"     iteration-time: "+(Date.now()-timing)+" milliseconds     cache hit rate="+(100*(cache_hit_and_miss - cache_misses)/cache_hit_and_miss));
		}
	}
}

benchmark();

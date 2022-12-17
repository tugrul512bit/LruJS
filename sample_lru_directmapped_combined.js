"use strict";

// 0:L1 cache hit test, 1:L2 cache hit test, 2:backing-store test (takes 5-10 seconds)
let benchmark = 0;
// fx8150 @ 3.6GHz and single-channel DDR3 @ 1333MHz:
// L1           =0.00015 milliseconds per pixel (simplest direct-mapped cache, integer-only indexing)
// L2           =0.00065 milliseconds per pixel (CLOCK-LRU algorithm + some more book-keeping)
// backing-store=1.68000 milliseconds per pixel (simulating heavy-work)


// slow but associative access
let L2 = require("./lrucache.js").Lru;
let L2_num_cache_elements = 20;
let L2_element_life_time_miliseconds = 1000;

// fast but a lot of collisions for various keys
let L1 = require("./lrucache.js").DirectMapped;
let L1_num_cache_elements = 4;


// compute pixel color to render a mandelbrot set
// 	input:
// 		x=index%WIDTH
// 		y=parseInt(index/WIDTH)
//	output:
//		color

// size of image
const N = 10;
let mandelbrot = { 
	get:function(index){ 
		let x = index%N;
		let y = parseInt(index/N);

		// your mandelbrot algorithm here
		let color = x+y*N; 
		for(let i=0;i<2000000;i++){} // dummy wait
		return color; 
	}, 
	set:function(index,value){ /* nobody writes to mandelbrot */ } 
};

// L2 cache serves data from backing-store or RAM
let L2_cache = new L2(L2_num_cache_elements, async function(key,callback){
	callback(mandelbrot.get(key));
}, L2_element_life_time_miliseconds, async function(key,value,callback){
	mandelbrot.set(key,value);
	callback();
});

// L1 cache serves data from L2 or RAM
let L1_cache = new L1(L1_num_cache_elements, async function(key,callback){
	L2_cache.get(key,function(result){ 
		callback(result); 
	});
}, async function(key,value,callback){
	L2_cache.set(key,value,function(result){ 
		callback(); 
	});
});

// init output
let image = [];
for(let y = 0; y < N; y++)
	for(let x = 0; x < N; x++)
	{
		image[x+y*N] = {d:-1,t:0,a:0};
	}

let ctr = 0;
let ctrMax = (benchmark==2)?10000:100000;
let timeTable={};
for(let ct = 0; ct < ctrMax; ct++)
{	
		let bench=[
			// L2 cache-miss benchmark
			parseInt(Math.random()*N*N),
		
			// L1 cache-miss benchmark
			parseInt(Math.random()*L2_num_cache_elements),

			// L1 cache-hit benchmark
			parseInt(Math.random()*L1_num_cache_elements)
		];

		let index = bench[2-benchmark];
		let t1 = Date.now();
		L1_cache.get(index,function(result){
			let t2 = Date.now();
			image[index].d=result;
			if(image[index].a>0)
				image[index].t+=(t2-t1);
			image[index].a++;
			ctr++;
			// if all pixels completed, render (console)
			if(ctr == ctrMax)
			{
				// compute average timing per access per pixel
				let total = 0;
				let num = 0;
				for(let y2 = 0; y2 < N; y2++)
					for(let x2 = 0; x2 < N; x2++)
					{
						image[x2+y2*N].t/=image[x2+y2*N].a;
						if(image[x2+y2*N].a>0)
						{	
							total += image[x2+y2*N].t; 
							num++;
						}
					}


				// d means data, t means time (milliseconds), a means number of accesses
				console.log(image);
				console.log(total/num+" milliseconds per pixel average");	
				ctr=0;
			}
		});
	
}


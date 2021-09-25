"use strict";

// this sample demonstrates getting multiple items from cache without causing callback-hell
// using Mandelbrot Set generator as cache-miss backing store
// using image softening algorithm for demonstration of requesting multiple values

let Lru = require("./lrucache.js").Lru;

// a cache that holds 100 pixels at a time and caches the computing task per pixel (not really an I/O task but takes a bit long)
let cache = new Lru(100, async function(key,callback){

    	// cache-miss data-load algorithm
	// Mandelbrot Set Generator
 	let xy=key.split(",");
	const MAX_ITERATION = 100
		
	    let z = { x: 0, y: 0 }, n = 0, p, d;
	    do {
		p = {
		    x: Math.pow(z.x, 2) - Math.pow(z.y, 2),
		    y: 2 * z.x * z.y
		};
		z = {
		    x: p.x + (xy[0]-200)/200,
		    y: p.y + (xy[1]-200)/200
		};
		d = Math.sqrt(Math.pow(z.x, 2) + Math.pow(z.y, 2));
		n += 1;
	    } while (d <= 2 && n < MAX_ITERATION);
	    
	
    callback(n);

},100000000 /* cache element lifetime milliseconds */);


// avoiding callback-hell when multiple values are needed at once (all values are gathered asynchronously and joined as a result array)
// image softening algorithm but on single pixel (which requires at least 4 neighbor pixels)
cache.getMultiple(function(results){
	console.log("pixel values: ");
	console.log(results);
	console.log("softened pixel value at 175,20: "+( results.reduce((x,y)=>{return x+y;}) )/5.0);
},"175,20" /* center pixel*/, "175,19" /* neighbor*/, "175,21" /* neighbor */, "174,21" /* neighbor */, "174,19" /* neighbor */);

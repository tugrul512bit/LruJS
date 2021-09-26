'use strict';

/* this code sample demonstrates awaitable get method that uses Promise but in a high-concurrency way instead of directly awaiting the result */

let fifo = require('mkfifo');
let mkfifo = fifo.mkfifo;
let N = 1000;

let usePromise = true;


const fs = require('fs');


let Lru = require("./lrucache.js").Lru;
let num_cache_elements = 1000;
let element_life_time_miliseconds = 1000;
let cache = new Lru(num_cache_elements, async function(key,callback){	
	mkfifo('./testfolder/fifo000'+(key.toString()), 384 | fs.constants.O_NONBLOCK, function(err) {		
		let fifoWs = fs.createWriteStream('./testfolder/fifo000'+(key.toString()));
		let fifoRs = fs.createReadStream( './testfolder/fifo000'+(key.toString()));	

		// simulating data-store request
		fifoWs.write(key.toString()); 

		// simulating data-store response
		// asynchronous
		fifoRs.on('data', function(chunk) {

			// don't leave the process un-exitable
			fifoRs.close(); 
			fifoWs.close();					

			// writing retrieved data to RAM (cache slot)
			callback(chunk.toString('utf8'));
		});
		fifoRs.read();

		
  	});
}, 10000);


// asynchronous data request

let repeats = 20;
async function benchmark()
{
	let benchTime = Date.now();
	let benchCtr = 0;
	let summation = 0;
	if(!usePromise)
	{
		for(let i=0;i<N;i++)		
			cache.get(i.toString(),function(data){
				benchCtr++;
				let val = parseInt(data);
				summation += val;
				if(benchCtr == N)
				{
					console.log("sum of values 0,...,"+(N-1)+"="+summation);
					console.log("Run-time: "+(Date.now()-benchTime)+" ms");
					if(repeats>0) { repeats--; benchmark(); }
					else
						process.exit();
				}
			});
	}
	else
	{
		let promiseArray = [];
    // init all promises, all async
		for(let i=0;i<N;i++)
		{
			promiseArray.push(cache.getAwaitable(i.toString()));
		}

    // synchronize promises one after another (since they all have some latency by fifo pipe, they may all be completed in nearly the same time)
		for(let i=0;i<N;i++)
		{
			let val = parseInt(await promiseArray[i]);
			benchCtr++;			
			summation += val;
			if(benchCtr == N)
			{
				console.log("sum of values 0,...,"+(N-1)+"="+summation);
				console.log("Run-time: "+(Date.now()-benchTime)+" ms");
				if(repeats>0) { repeats--; benchmark(); }
				else
					process.exit();
			}
		}
	}
}
benchmark();

